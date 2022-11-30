import type ts from 'typescript/lib/tsserverlibrary';
import { ConfigManager } from '../config-manager';
import { Logger } from '../logger';
import { HamberSnapshotManager } from '../hamber-snapshots';
import { isHamberFilePath } from '../utils';
import { decorateCompletions } from './completions';
import { decorateGetDefinition } from './definition';
import { decorateDiagnostics } from './diagnostics';
import { decorateFindReferences } from './find-references';
import { decorateGetImplementation } from './implementation';
import { decorateRename } from './rename';
import { decorateUpdateImports } from './update-imports';

const hamberPluginPatchSymbol = Symbol('hamberPluginPatchSymbol');

export function isPatched(ls: ts.LanguageService) {
    return (ls as any)[hamberPluginPatchSymbol] === true;
}

export function decorateLanguageService(
    ls: ts.LanguageService,
    snapshotManager: HamberSnapshotManager,
    logger: Logger,
    configManager: ConfigManager
) {
    // Decorate using a proxy so we can dynamically enable/disable method
    // patches depending on the enabled state of our config
    const proxy = new Proxy(ls, createProxyHandler(configManager));
    decorateLanguageServiceInner(proxy, snapshotManager, logger);
    return proxy;
}

function decorateLanguageServiceInner(
    ls: ts.LanguageService,
    snapshotManager: HamberSnapshotManager,
    logger: Logger
): ts.LanguageService {
    patchLineColumnOffset(ls, snapshotManager);
    decorateRename(ls, snapshotManager, logger);
    decorateDiagnostics(ls, logger);
    decorateFindReferences(ls, snapshotManager, logger);
    decorateCompletions(ls, logger);
    decorateGetDefinition(ls, snapshotManager, logger);
    decorateGetImplementation(ls, snapshotManager, logger);
    decorateUpdateImports(ls, snapshotManager, logger);
    return ls;
}

function createProxyHandler(configManager: ConfigManager): ProxyHandler<ts.LanguageService> {
    const decorated: Partial<ts.LanguageService> = {};

    return {
        get(target, p) {
            // always return patch symbol whether the plugin is enabled or not
            if (p === hamberPluginPatchSymbol) {
                return true;
            }

            if (!configManager.getConfig().enable || p === 'dispose') {
                return target[p as keyof ts.LanguageService];
            }

            return (
                decorated[p as keyof ts.LanguageService] ?? target[p as keyof ts.LanguageService]
            );
        },
        set(_, p, value) {
            decorated[p as keyof ts.LanguageService] = value;

            return true;
        }
    };
}

function patchLineColumnOffset(ls: ts.LanguageService, snapshotManager: HamberSnapshotManager) {
    if (!ls.toLineColumnOffset) {
        return;
    }

    // We need to patch this because (according to source, only) getDefinition uses this
    const toLineColumnOffset = ls.toLineColumnOffset;
    ls.toLineColumnOffset = (fileName, position) => {
        if (isHamberFilePath(fileName)) {
            const snapshot = snapshotManager.get(fileName);
            if (snapshot) {
                return snapshot.positionAt(position);
            }
        }
        return toLineColumnOffset(fileName, position);
    };
}
