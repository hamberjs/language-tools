import {
    CancellationToken,
    CodeAction,
    CodeActionContext,
    CompletionContext,
    CompletionList,
    Diagnostic,
    FormattingOptions,
    Hover,
    Position,
    Range,
    SelectionRange,
    TextEdit,
    WorkspaceEdit
} from 'vscode-languageserver';
import { getPackageInfo, importPrettier } from '../../importPackage';
import { Document } from '../../lib/documents';
import { Logger } from '../../logger';
import { LSConfigManager, LSHamberConfig } from '../../ls-config';
import {
    CodeActionsProvider,
    CompletionsProvider,
    DiagnosticsProvider,
    FormattingProvider,
    HoverProvider,
    SelectionRangeProvider
} from '../interfaces';
import { executeCommand, getCodeActions } from './features/getCodeActions';
import { getCompletions } from './features/getCompletions';
import { getDiagnostics } from './features/getDiagnostics';
import { getHoverInfo } from './features/getHoverInfo';
import { getSelectionRange } from './features/getSelectionRanges';
import { HamberCompileResult, HamberDocument } from './HamberDocument';

export class HamberPlugin
    implements
        DiagnosticsProvider,
        FormattingProvider,
        CompletionsProvider,
        HoverProvider,
        CodeActionsProvider,
        SelectionRangeProvider
{
    __name = 'hamber';
    private docManager = new Map<Document, HamberDocument>();

    constructor(private configManager: LSConfigManager) {}

    async getDiagnostics(document: Document): Promise<Diagnostic[]> {
        if (!this.featureEnabled('diagnostics') || !this.configManager.getIsTrusted()) {
            return [];
        }

        return getDiagnostics(
            document,
            await this.getHamberDoc(document),
            this.configManager.getConfig().hamber.compilerWarnings
        );
    }

    async getCompiledResult(document: Document): Promise<HamberCompileResult | null> {
        try {
            const hamberDoc = await this.getHamberDoc(document);
            return hamberDoc.getCompiledWith({ generate: 'dom' });
        } catch (error) {
            return null;
        }
    }

    async formatDocument(document: Document, options: FormattingOptions): Promise<TextEdit[]> {
        if (!this.featureEnabled('format')) {
            return [];
        }

        const filePath = document.getFilePath()!;
        const prettier = importPrettier(filePath);
        // Try resolving the config through prettier and fall back to possible editor config
        const config = this.configManager.getMergedPrettierConfig(
            await prettier.resolveConfig(filePath, { editorconfig: true }),
            // Be defensive here because IDEs other than VSCode might not have these settings
            options && {
                tabWidth: options.tabSize,
                useTabs: !options.insertSpaces
            }
        );
        // If user has prettier-plugin-hamber 1.x, then remove `options` from the sort
        // order or else it will throw a config error (`options` was not present back then).
        if (
            config?.hamberSortOrder &&
            getPackageInfo('prettier-plugin-hamber', filePath)?.version.major < 2
        ) {
            config.hamberSortOrder = config.hamberSortOrder
                .replace('-options', '')
                .replace('options-', '');
        }
        // Take .prettierignore into account
        const fileInfo = await prettier.getFileInfo(filePath, {
            ignorePath: this.configManager.getPrettierConfig()?.ignorePath ?? '.prettierignore',
            // Ramber places stuff within src/node_modules, we want to format that, too
            withNodeModules: true
        });
        if (fileInfo.ignored) {
            Logger.debug('File is ignored, formatting skipped');
            return [];
        }

        const formattedCode = prettier.format(document.getText(), {
            ...config,
            plugins: [...(config.plugins ?? []), ...getHamberPlugin()],
            parser: 'hamber' as any
        });

        return document.getText() === formattedCode
            ? []
            : [
                  TextEdit.replace(
                      Range.create(
                          document.positionAt(0),
                          document.positionAt(document.getTextLength())
                      ),
                      formattedCode
                  )
              ];

        function getHamberPlugin() {
            // Only provide our version of the hamber plugin if the user doesn't have one in
            // the workspace already. If we did it, Prettier would - for some reason - use
            // the workspace version for parsing and the extension version for printing,
            // which could crash if the contract of the parser output changed.
            const hasPluginLoadedAlready = prettier
                .getSupportInfo()
                .languages.some((l) => l.name === 'hamber');
            return hasPluginLoadedAlready ? [] : [require.resolve('prettier-plugin-hamber')];
        }
    }

    async getCompletions(
        document: Document,
        position: Position,
        _?: CompletionContext,
        cancellationToken?: CancellationToken
    ): Promise<CompletionList | null> {
        if (!this.featureEnabled('completions')) {
            return null;
        }

        const hamberDoc = await this.getHamberDoc(document);
        if (cancellationToken?.isCancellationRequested) {
            return null;
        }

        return getCompletions(document, hamberDoc, position);
    }

    async doHover(document: Document, position: Position): Promise<Hover | null> {
        if (!this.featureEnabled('hover')) {
            return null;
        }

        return getHoverInfo(document, await this.getHamberDoc(document), position);
    }

    async getCodeActions(
        document: Document,
        range: Range,
        context: CodeActionContext,
        cancellationToken?: CancellationToken
    ): Promise<CodeAction[]> {
        if (!this.featureEnabled('codeActions')) {
            return [];
        }

        const hamberDoc = await this.getHamberDoc(document);

        if (cancellationToken?.isCancellationRequested) {
            return [];
        }

        try {
            return getCodeActions(hamberDoc, range, context);
        } catch (error) {
            return [];
        }
    }

    async executeCommand(
        document: Document,
        command: string,
        args?: any[]
    ): Promise<WorkspaceEdit | string | null> {
        if (!this.featureEnabled('codeActions')) {
            return null;
        }

        const hamberDoc = await this.getHamberDoc(document);
        try {
            return executeCommand(hamberDoc, command, args);
        } catch (error) {
            return null;
        }
    }

    async getSelectionRange(
        document: Document,
        position: Position
    ): Promise<SelectionRange | null> {
        if (!this.featureEnabled('selectionRange')) {
            return null;
        }

        const hamberDoc = await this.getHamberDoc(document);

        return getSelectionRange(hamberDoc, position);
    }

    private featureEnabled(feature: keyof LSHamberConfig) {
        return (
            this.configManager.enabled('hamber.enable') &&
            this.configManager.enabled(`hamber.${feature}.enable`)
        );
    }

    private async getHamberDoc(document: Document) {
        let hamberDoc = this.docManager.get(document);
        if (!hamberDoc || hamberDoc.version !== document.version) {
            hamberDoc = new HamberDocument(document);
            this.docManager.set(document, hamberDoc);
        }
        return hamberDoc;
    }
}
