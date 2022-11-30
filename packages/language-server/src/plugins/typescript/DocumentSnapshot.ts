import { EncodedSourceMap, TraceMap } from '@jridgewell/trace-mapping';
import { walk } from 'hamber/compiler';
import { TemplateNode } from 'hamber/types/compiler/interfaces';
import { hamber2tsx, IExportedNames } from 'hamber2tsx';
import ts from 'typescript';
import { Position, Range, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import {
    Document,
    DocumentMapper,
    FragmentMapper,
    IdentityMapper,
    offsetAt,
    positionAt,
    TagInformation,
    isInTag,
    getLineOffsets
} from '../../lib/documents';
import { pathToUrl } from '../../utils';
import { ConsumerDocumentMapper } from './DocumentMapper';
import { HamberNode } from './hamber-ast-utils';
import {
    getScriptKindFromAttributes,
    getScriptKindFromFileName,
    isHamberFilePath,
    getTsCheckComment
} from './utils';

/**
 * An error which occured while trying to parse/preprocess the hamber file contents.
 */
export interface ParserError {
    message: string;
    range: Range;
    code: number;
}

/**
 * Initial version of snapshots.
 */
export const INITIAL_VERSION = 0;

/**
 * A document snapshot suitable for the ts language service and the plugin.
 * Can be a real ts/js file or a virtual ts/js file which is generated from a Hamber file.
 */
export interface DocumentSnapshot extends ts.IScriptSnapshot, DocumentMapper {
    version: number;
    filePath: string;
    scriptKind: ts.ScriptKind;
    scriptInfo: TagInformation | null;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
    /**
     * Convenience function for getText(0, getLength())
     */
    getFullText(): string;
}

/**
 * Options that apply to hamber files.
 */
export interface HamberSnapshotOptions {
    transformOnTemplateError: boolean;
    useNewTransformation: boolean;
    typingsNamespace: string;
}

export namespace DocumentSnapshot {
    /**
     * Returns a hamber snapshot from a hamber document.
     * @param document the hamber document
     * @param options options that apply to the hamber document
     */
    export function fromDocument(document: Document, options: HamberSnapshotOptions) {
        const { tsxMap, htmlAst, text, exportedNames, parserError, nrPrependedLines, scriptKind } =
            preprocessHamberFile(document, options);

        return new HamberDocumentSnapshot(
            document,
            parserError,
            scriptKind,
            text,
            nrPrependedLines,
            exportedNames,
            tsxMap,
            htmlAst
        );
    }

    /**
     * Returns a hamber or ts/js snapshot from a file path, depending on the file contents.
     * @param filePath path to the js/ts/hamber file
     * @param createDocument function that is used to create a document in case it's a Hamber file
     * @param options options that apply in case it's a hamber file
     */
    export function fromFilePath(
        filePath: string,
        createDocument: (filePath: string, text: string) => Document,
        options: HamberSnapshotOptions,
        tsSystem: ts.System
    ) {
        if (isHamberFilePath(filePath)) {
            return DocumentSnapshot.fromHamberFilePath(filePath, createDocument, options);
        } else {
            return DocumentSnapshot.fromNonHamberFilePath(filePath, tsSystem);
        }
    }

    /**
     * Returns a ts/js snapshot from a file path.
     * @param filePath path to the js/ts file
     * @param options options that apply in case it's a hamber file
     */
    export function fromNonHamberFilePath(filePath: string, tsSystem: ts.System) {
        let originalText = '';

        // The following (very hacky) code makes sure that the ambient module definitions
        // that tell TS "every import ending with .hamber is a valid module" are removed.
        // They exist in hamber2tsx and hamber to make sure that people don't
        // get errors in their TS files when importing Hamber files and not using our TS plugin.
        // If someone wants to get back the behavior they can add an ambient module definition
        // on their own.
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (!normalizedPath.endsWith('node_modules/hamber/types/runtime/ambient.d.ts')) {
            originalText = tsSystem.readFile(filePath) || '';
        }
        if (
            normalizedPath.endsWith('hamber2tsx/hamber-shims.d.ts') ||
            normalizedPath.endsWith('hamber-check/dist/src/hamber-shims.d.ts')
        ) {
            // If not present, the LS uses an older version of hamber2tsx
            if (originalText.includes('// -- start hamber-ls-remove --')) {
                originalText =
                    originalText.substring(
                        0,
                        originalText.indexOf('// -- start hamber-ls-remove --')
                    ) +
                    originalText.substring(originalText.indexOf('// -- end hamber-ls-remove --'));
            }
        }

        return new JSOrTSDocumentSnapshot(INITIAL_VERSION, filePath, originalText);
    }

    /**
     * Returns a hamber snapshot from a file path.
     * @param filePath path to the hamber file
     * @param createDocument function that is used to create a document
     * @param options options that apply in case it's a hamber file
     */
    export function fromHamberFilePath(
        filePath: string,
        createDocument: (filePath: string, text: string) => Document,
        options: HamberSnapshotOptions
    ) {
        const originalText = ts.sys.readFile(filePath) ?? '';
        return fromDocument(createDocument(filePath, originalText), options);
    }
}

/**
 * Tries to preprocess the hamber document and convert the contents into better analyzable js/ts(x) content.
 */
function preprocessHamberFile(document: Document, options: HamberSnapshotOptions) {
    let tsxMap: EncodedSourceMap | undefined;
    let parserError: ParserError | null = null;
    let nrPrependedLines = 0;
    let text = document.getText();
    let exportedNames: IExportedNames = { has: () => false };
    let htmlAst: TemplateNode | undefined;

    const scriptKind = [
        getScriptKindFromAttributes(document.scriptInfo?.attributes ?? {}),
        getScriptKindFromAttributes(document.moduleScriptInfo?.attributes ?? {})
    ].includes(ts.ScriptKind.TSX)
        ? options.useNewTransformation
            ? ts.ScriptKind.TS
            : ts.ScriptKind.TSX
        : options.useNewTransformation
        ? ts.ScriptKind.JS
        : ts.ScriptKind.JSX;

    try {
        const tsx = hamber2tsx(text, {
            filename: document.getFilePath() ?? undefined,
            isTsFile: options.useNewTransformation
                ? scriptKind === ts.ScriptKind.TS
                : scriptKind === ts.ScriptKind.TSX,
            mode: options.useNewTransformation ? 'ts' : 'tsx',
            typingsNamespace: options.useNewTransformation ? options.typingsNamespace : undefined,
            emitOnTemplateError: options.transformOnTemplateError,
            namespace: document.config?.compilerOptions?.namespace,
            accessors:
                document.config?.compilerOptions?.accessors ??
                document.config?.compilerOptions?.customElement
        });
        text = tsx.code;
        tsxMap = tsx.map as EncodedSourceMap;
        exportedNames = tsx.exportedNames;
        // We know it's there, it's not part of the public API so people don't start using it
        htmlAst = (tsx as any).htmlAst;

        if (tsxMap) {
            tsxMap.sources = [document.uri];

            const scriptInfo = document.scriptInfo || document.moduleScriptInfo;
            const tsCheck = getTsCheckComment(scriptInfo?.content);
            if (tsCheck) {
                text = tsCheck + text;
                nrPrependedLines = 1;
            }
        }
    } catch (e: any) {
        // Error start/end logic is different and has different offsets for line, so we need to convert that
        const start: Position = {
            line: (e.start?.line ?? 1) - 1,
            character: e.start?.column ?? 0
        };
        const end: Position = e.end ? { line: e.end.line - 1, character: e.end.column } : start;

        parserError = {
            range: { start, end },
            message: e.message,
            code: -1
        };

        // fall back to extracted script, if any
        const scriptInfo = document.scriptInfo || document.moduleScriptInfo;
        text = scriptInfo ? scriptInfo.content : '';
    }

    return {
        tsxMap,
        text,
        exportedNames,
        htmlAst,
        parserError,
        nrPrependedLines,
        scriptKind
    };
}

/**
 * A hamber document snapshot suitable for the TS language service and the plugin.
 * It contains the generated code (Hamber->TS/JS) so the TS language service can understand it.
 */
export class HamberDocumentSnapshot implements DocumentSnapshot {
    private mapper?: DocumentMapper;
    private lineOffsets?: number[];
    private url = pathToUrl(this.filePath);

    version = this.parent.version;

    constructor(
        public readonly parent: Document,
        public readonly parserError: ParserError | null,
        public readonly scriptKind: ts.ScriptKind,
        private readonly text: string,
        private readonly nrPrependedLines: number,
        private readonly exportedNames: IExportedNames,
        private readonly tsxMap?: EncodedSourceMap,
        private readonly htmlAst?: TemplateNode
    ) {}

    get filePath() {
        return this.parent.getFilePath() || '';
    }

    get scriptInfo() {
        return this.parent.scriptInfo;
    }

    get moduleScriptInfo() {
        return this.parent.moduleScriptInfo;
    }

    getOriginalText(range?: Range) {
        return this.parent.getText(range);
    }

    getText(start: number, end: number) {
        return this.text.substring(start, end);
    }

    getLength() {
        return this.text.length;
    }

    getFullText() {
        return this.text;
    }

    getChangeRange() {
        return undefined;
    }

    positionAt(offset: number) {
        return positionAt(offset, this.text, this.getLineOffsets());
    }

    offsetAt(position: Position): number {
        return offsetAt(position, this.text, this.getLineOffsets());
    }

    getLineContainingOffset(offset: number) {
        const chunks = this.getText(0, offset).split('\n');
        return chunks[chunks.length - 1];
    }

    hasProp(name: string): boolean {
        return this.exportedNames.has(name);
    }

    hamberNodeAt(postionOrOffset: number | Position): HamberNode | null {
        if (!this.htmlAst) {
            return null;
        }
        const offset =
            typeof postionOrOffset === 'number'
                ? postionOrOffset
                : this.parent.offsetAt(postionOrOffset);

        let foundNode: HamberNode | null = null;
        walk(this.htmlAst, {
            enter(node) {
                // In case the offset is at a point where a node ends and a new one begins,
                // the node where the code ends is used. If this introduces problems, introduce
                // an affinity parameter to prefer the node where it ends/starts.
                if ((node as HamberNode).start > offset || (node as HamberNode).end < offset) {
                    this.skip();
                    return;
                }
                const parent = foundNode;
                // Spread so the "parent" property isn't added to the original ast,
                // causing an infinite loop
                foundNode = { ...node } as HamberNode;
                if (parent) {
                    foundNode.parent = parent;
                }
            }
        });

        return foundNode;
    }

    getOriginalPosition(pos: Position): Position {
        return this.getMapper().getOriginalPosition(pos);
    }

    getGeneratedPosition(pos: Position): Position {
        return this.getMapper().getGeneratedPosition(pos);
    }

    isInGenerated(pos: Position): boolean {
        return !isInTag(pos, this.parent.styleInfo);
    }

    getURL(): string {
        return this.url;
    }

    private getLineOffsets() {
        if (!this.lineOffsets) {
            this.lineOffsets = getLineOffsets(this.text);
        }
        return this.lineOffsets;
    }

    private getMapper() {
        if (!this.mapper) {
            this.mapper = this.initMapper();
        }
        return this.mapper;
    }

    private initMapper() {
        const scriptInfo = this.parent.scriptInfo || this.parent.moduleScriptInfo;

        if (!this.tsxMap) {
            if (!scriptInfo) {
                return new IdentityMapper(this.url);
            }

            return new FragmentMapper(this.parent.getText(), scriptInfo, this.url);
        }

        return new ConsumerDocumentMapper(
            new TraceMap(this.tsxMap),
            this.url,
            this.nrPrependedLines
        );
    }
}

/**
 * A js/ts document snapshot suitable for the ts language service and the plugin.
 * Since no mapping has to be done here, it also implements the mapper interface.
 */
export class JSOrTSDocumentSnapshot extends IdentityMapper implements DocumentSnapshot {
    scriptKind = getScriptKindFromFileName(this.filePath);
    scriptInfo = null;
    private lineOffsets?: number[];

    constructor(public version: number, public readonly filePath: string, private text: string) {
        super(pathToUrl(filePath));
    }

    getText(start: number, end: number) {
        return this.text.substring(start, end);
    }

    getLength() {
        return this.text.length;
    }

    getFullText() {
        return this.text;
    }

    getChangeRange() {
        return undefined;
    }

    positionAt(offset: number) {
        return positionAt(offset, this.text, this.getLineOffsets());
    }

    offsetAt(position: Position): number {
        return offsetAt(position, this.text, this.getLineOffsets());
    }

    update(changes: TextDocumentContentChangeEvent[]): void {
        for (const change of changes) {
            let start = 0;
            let end = 0;
            if ('range' in change) {
                start = this.offsetAt(change.range.start);
                end = this.offsetAt(change.range.end);
            } else {
                end = this.getLength();
            }

            this.text = this.text.slice(0, start) + change.text + this.text.slice(end);
        }

        this.version++;
        this.lineOffsets = undefined;
    }

    private getLineOffsets() {
        if (!this.lineOffsets) {
            this.lineOffsets = getLineOffsets(this.text);
        }
        return this.lineOffsets;
    }
}
