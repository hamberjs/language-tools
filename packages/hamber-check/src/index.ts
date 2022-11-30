import { watch } from 'chokidar';
import * as fs from 'fs';
import glob from 'fast-glob';
import * as path from 'path';
import { HamberCheck, HamberCheckOptions } from 'hamber-language-server';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { parseOptions, HamberCheckCliOptions } from './options';
import {
    DEFAULT_FILTER,
    DiagnosticFilter,
    HumanFriendlyWriter,
    MachineFriendlyWriter,
    Writer
} from './writers';

type Result = {
    fileCount: number;
    errorCount: number;
    warningCount: number;
    hintCount: number;
};

async function openAllDocuments(
    workspaceUri: URI,
    filePathsToIgnore: string[],
    hamberCheck: HamberCheck
) {
    const files = await glob('**/*.hamber', {
        cwd: workspaceUri.fsPath,
        ignore: ['node_modules/**'].concat(filePathsToIgnore.map((ignore) => `${ignore}/**`))
    });
    const absFilePaths = files.map((f) => path.resolve(workspaceUri.fsPath, f));

    for (const absFilePath of absFilePaths) {
        const text = fs.readFileSync(absFilePath, 'utf-8');
        hamberCheck.upsertDocument(
            {
                uri: URI.file(absFilePath).toString(),
                text
            },
            true
        );
    }
}

async function getDiagnostics(
    workspaceUri: URI,
    writer: Writer,
    hamberCheck: HamberCheck
): Promise<Result | null> {
    writer.start(workspaceUri.fsPath);

    try {
        const diagnostics = await hamberCheck.getDiagnostics();

        const result: Result = {
            fileCount: diagnostics.length,
            errorCount: 0,
            warningCount: 0,
            hintCount: 0
        };

        for (const diagnostic of diagnostics) {
            writer.file(
                diagnostic.diagnostics,
                workspaceUri.fsPath,
                path.relative(workspaceUri.fsPath, diagnostic.filePath),
                diagnostic.text
            );

            diagnostic.diagnostics.forEach((d: Diagnostic) => {
                if (d.severity === DiagnosticSeverity.Error) {
                    result.errorCount += 1;
                } else if (d.severity === DiagnosticSeverity.Warning) {
                    result.warningCount += 1;
                } else if (d.severity === DiagnosticSeverity.Hint) {
                    result.hintCount += 1;
                }
            });
        }

        writer.completion(
            result.fileCount,
            result.errorCount,
            result.warningCount,
            result.hintCount
        );
        return result;
    } catch (err: any) {
        writer.failure(err);
        return null;
    }
}

class DiagnosticsWatcher {
    private updateDiagnostics: any;

    constructor(
        private workspaceUri: URI,
        private hamberCheck: HamberCheck,
        private writer: Writer,
        filePathsToIgnore: string[],
        ignoreInitialAdd: boolean
    ) {
        watch(`${workspaceUri.fsPath}/**/*.{hamber,d.ts,ts,js}`, {
            ignored: ['node_modules']
                .concat(filePathsToIgnore)
                .map((ignore) => path.join(workspaceUri.fsPath, ignore)),
            ignoreInitial: ignoreInitialAdd
        })
            .on('add', (path) => this.updateDocument(path, true))
            .on('unlink', (path) => this.removeDocument(path))
            .on('change', (path) => this.updateDocument(path, false));

        if (ignoreInitialAdd) {
            this.scheduleDiagnostics();
        }
    }

    private async updateDocument(path: string, isNew: boolean) {
        const text = fs.readFileSync(path, 'utf-8');
        await this.hamberCheck.upsertDocument({ text, uri: URI.file(path).toString() }, isNew);
        this.scheduleDiagnostics();
    }

    private async removeDocument(path: string) {
        await this.hamberCheck.removeDocument(URI.file(path).toString());
        this.scheduleDiagnostics();
    }

    scheduleDiagnostics() {
        clearTimeout(this.updateDiagnostics);
        this.updateDiagnostics = setTimeout(
            () => getDiagnostics(this.workspaceUri, this.writer, this.hamberCheck),
            1000
        );
    }
}

function createFilter(opts: HamberCheckCliOptions): DiagnosticFilter {
    switch (opts.threshold) {
        case 'error':
            return (d) => d.severity === DiagnosticSeverity.Error;
        case 'warning':
            return (d) =>
                d.severity === DiagnosticSeverity.Error ||
                d.severity === DiagnosticSeverity.Warning;
        default:
            return DEFAULT_FILTER;
    }
}

function instantiateWriter(opts: HamberCheckCliOptions): Writer {
    const filter = createFilter(opts);

    if (opts.outputFormat === 'human-verbose' || opts.outputFormat === 'human') {
        return new HumanFriendlyWriter(
            process.stdout,
            opts.outputFormat === 'human-verbose',
            opts.watch,
            filter
        );
    } else {
        return new MachineFriendlyWriter(process.stdout, filter);
    }
}

parseOptions(async (opts) => {
    try {
        const writer = instantiateWriter(opts);

        const hamberCheckOptions: HamberCheckOptions = {
            compilerWarnings: opts.compilerWarnings,
            diagnosticSources: opts.diagnosticSources,
            tsconfig: opts.tsconfig,
            useNewTransformation: opts.useNewTransformation,
            watch: opts.watch
        };

        if (opts.watch) {
            hamberCheckOptions.onProjectReload = () => watcher.scheduleDiagnostics();
            const watcher = new DiagnosticsWatcher(
                opts.workspaceUri,
                new HamberCheck(opts.workspaceUri.fsPath, hamberCheckOptions),
                writer,
                opts.filePathsToIgnore,
                !!opts.tsconfig
            );
        } else {
            const hamberCheck = new HamberCheck(opts.workspaceUri.fsPath, hamberCheckOptions);

            if (!opts.tsconfig) {
                await openAllDocuments(opts.workspaceUri, opts.filePathsToIgnore, hamberCheck);
            }
            const result = await getDiagnostics(opts.workspaceUri, writer, hamberCheck);
            if (
                result &&
                result.errorCount === 0 &&
                (!opts.failOnWarnings || result.warningCount === 0) &&
                (!opts.failOnHints || result.hintCount === 0)
            ) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        }
    } catch (_err) {
        console.error(_err);
        console.error('hamber-check failed');
    }
});
