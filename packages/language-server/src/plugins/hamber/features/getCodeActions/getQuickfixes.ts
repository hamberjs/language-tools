import { walk } from 'estree-walker';
import { EOL } from 'os';
import { Ast } from 'hamber/types/compiler/interfaces';
import {
    CodeAction,
    CodeActionKind,
    Diagnostic,
    DiagnosticSeverity,
    OptionalVersionedTextDocumentIdentifier,
    Position,
    TextDocumentEdit,
    TextEdit
} from 'vscode-languageserver';
import {
    getLineOffsets,
    mapObjWithRangeToOriginal,
    offsetAt,
    positionAt
} from '../../../../lib/documents';
import { getIndent, pathToUrl } from '../../../../utils';
import { HamberDocument } from '../../HamberDocument';
import ts from 'typescript';
// estree does not have start/end in their public Node interface,
// but the AST returned by hamber/compiler does. Type as any as a workaround.
type Node = any;

/**
 * Get applicable quick fixes.
 */
export async function getQuickfixActions(
    hamberDoc: HamberDocument,
    hamberDiagnostics: Diagnostic[]
) {
    const { ast } = await hamberDoc.getCompiled();

    return Promise.all(
        hamberDiagnostics.map(
            async (diagnostic) => await createQuickfixAction(diagnostic, hamberDoc, ast)
        )
    );
}

async function createQuickfixAction(
    diagnostic: Diagnostic,
    hamberDoc: HamberDocument,
    ast: Ast
): Promise<CodeAction> {
    const textDocument = OptionalVersionedTextDocumentIdentifier.create(
        pathToUrl(hamberDoc.getFilePath()),
        null
    );

    return CodeAction.create(
        getCodeActionTitle(diagnostic),
        {
            documentChanges: [
                TextDocumentEdit.create(textDocument, [
                    await getHamberIgnoreEdit(hamberDoc, ast, diagnostic)
                ])
            ]
        },
        CodeActionKind.QuickFix
    );
}

function getCodeActionTitle(diagnostic: Diagnostic) {
    // make it distinguishable with eslint's code action
    return `(hamber) Disable ${diagnostic.code} for this line`;
}

/**
 * Whether or not the given diagnostic can be ignored via a
 * <!-- hamber-ignore <code> -->
 */
export function isIgnorableHamberDiagnostic(diagnostic: Diagnostic) {
    const { source, severity, code } = diagnostic;
    return (
        code &&
        !nonIgnorableWarnings.includes(<string>code) &&
        source === 'hamber' &&
        severity !== DiagnosticSeverity.Error
    );
}
const nonIgnorableWarnings = [
    'missing-custom-element-compile-options',
    'unused-export-let',
    'css-unused-selector'
];

async function getHamberIgnoreEdit(hamberDoc: HamberDocument, ast: Ast, diagnostic: Diagnostic) {
    const {
        code,
        range: { start, end }
    } = diagnostic;
    const transpiled = await hamberDoc.getTranspiled();
    const content = transpiled.getText();
    const lineOffsets = getLineOffsets(content);
    const { html } = ast;
    const generatedStart = transpiled.getGeneratedPosition(start);
    const generatedEnd = transpiled.getGeneratedPosition(end);

    const diagnosticStartOffset = offsetAt(generatedStart, content, lineOffsets);
    const diagnosticEndOffset = offsetAt(generatedEnd, content, lineOffsets);
    const offsetRange: ts.TextRange = {
        pos: diagnosticStartOffset,
        end: diagnosticEndOffset
    };

    const node = findTagForRange(html, offsetRange);

    const nodeStartPosition = positionAt(node.start, content, lineOffsets);
    const nodeLineStart = offsetAt(
        {
            line: nodeStartPosition.line,
            character: 0
        },
        content,
        lineOffsets
    );
    const afterStartLineStart = content.slice(nodeLineStart);
    const indent = getIndent(afterStartLineStart);

    // TODO: Make all code action's new line consistent
    const ignore = `${indent}<!-- hamber-ignore ${code} -->${EOL}`;
    const position = Position.create(nodeStartPosition.line, 0);

    return mapObjWithRangeToOriginal(transpiled, TextEdit.insert(position, ignore));
}

const elementOrComponent = ['Component', 'Element', 'InlineComponent'];

function findTagForRange(html: Node, range: ts.TextRange) {
    let nearest = html;

    walk(html, {
        enter(node, parent) {
            const { type } = node;
            const isBlock = 'block' in node || node.type.toLowerCase().includes('block');
            const isFragment = type === 'Fragment';
            const keepLooking = isFragment || elementOrComponent.includes(type) || isBlock;
            if (!keepLooking) {
                this.skip();
                return;
            }

            if (within(node, range) && parent === nearest) {
                nearest = node;
            }
        }
    });

    return nearest;
}

function within(node: Node, range: ts.TextRange) {
    return node.end >= range.end && node.start <= range.pos;
}
