import { LanguageClient } from 'vscode-languageclient/node';
import {
    Uri,
    TextDocumentContentProvider,
    EventEmitter,
    workspace,
    window,
    Disposable
} from 'vscode';
import { atob, btoa } from './utils';
import { debounce } from 'lodash';

type CompiledCodeResp = {
    js: { code: string; map: any };
    css: { code: string; map: any };
};

const HAMBER_URI_SCHEME = 'hamber-compiled';

function toHamberSchemeUri<B extends boolean = false>(
    srcUri: string | Uri,
    asString?: B
): B extends true ? string : Uri {
    srcUri = typeof srcUri == 'string' ? Uri.parse(srcUri) : srcUri;
    const src = btoa(srcUri.toString());
    const destUri = srcUri.with({
        scheme: HAMBER_URI_SCHEME,
        fragment: src,
        path: srcUri.path + '.js'
    });
    return (asString ? destUri.toString() : destUri) as any;
}

function fromHamberSchemeUri<B extends boolean = false>(
    destUri: string | Uri,
    asString?: B
): B extends true ? string : Uri {
    destUri = typeof destUri == 'string' ? Uri.parse(destUri) : destUri;
    const src = atob(destUri.fragment);
    return (asString ? src : Uri.parse(src)) as any;
}

export default class CompiledCodeContentProvider implements TextDocumentContentProvider {
    static scheme = HAMBER_URI_SCHEME;
    static toHamberSchemeUri = toHamberSchemeUri;
    static fromHamberSchemeUri = fromHamberSchemeUri;

    private disposed = false;
    private didChangeEmitter = new EventEmitter<Uri>();
    private subscriptions: Disposable[] = [];
    private watchedSourceUri = new Set<string>();

    get onDidChange() {
        return this.didChangeEmitter.event;
    }

    constructor(private getLanguageClient: () => LanguageClient) {
        this.subscriptions.push(
            workspace.onDidChangeTextDocument(
                debounce(async (changeEvent) => {
                    if (changeEvent.document.languageId !== 'hamber') {
                        return;
                    }

                    const srcUri = changeEvent.document.uri.toString();
                    if (this.watchedSourceUri.has(srcUri)) {
                        this.didChangeEmitter.fire(toHamberSchemeUri(srcUri));
                    }
                }, 500)
            )
        );

        window.onDidChangeVisibleTextEditors((editors) => {
            const previewEditors = editors.filter(
                (editor) => editor?.document?.uri?.scheme === HAMBER_URI_SCHEME
            );
            this.watchedSourceUri = new Set(
                previewEditors.map((editor) => fromHamberSchemeUri(editor.document.uri, true))
            );
        });
    }

    async provideTextDocumentContent(uri: Uri): Promise<string | undefined> {
        const srcUriStr = fromHamberSchemeUri(uri, true);
        this.watchedSourceUri.add(srcUriStr);

        const resp = await this.getLanguageClient().sendRequest<CompiledCodeResp>(
            '$/getCompiledCode',
            srcUriStr
        );
        if (resp?.js?.code) {
            return resp.js.code;
        } else {
            window.setStatusBarMessage(`Hamber: fail to compile ${uri.path}`, 3000);
        }
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this.didChangeEmitter.dispose();
        this.subscriptions.forEach((d) => d.dispose());
        this.subscriptions.length = 0;
        this.disposed = true;
    }
}
