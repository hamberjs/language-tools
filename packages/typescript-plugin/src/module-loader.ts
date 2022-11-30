import type ts from 'typescript/lib/tsserverlibrary';
import { ConfigManager } from './config-manager';
import { Logger } from './logger';
import { HamberSnapshotManager } from './hamber-snapshots';
import { createHamberSys } from './hamber-sys';
import { ensureRealHamberFilePath, isVirtualHamberFilePath } from './utils';

/**
 * Caches resolved modules.
 */
class ModuleResolutionCache {
    private cache = new Map<string, ts.ResolvedModule>();

    /**
     * Tries to get a cached module.
     */
    get(moduleName: string, containingFile: string): ts.ResolvedModule | undefined {
        return this.cache.get(this.getKey(moduleName, containingFile));
    }

    /**
     * Caches resolved module, if it is not undefined.
     */
    set(moduleName: string, containingFile: string, resolvedModule: ts.ResolvedModule | undefined) {
        if (!resolvedModule) {
            return;
        }
        this.cache.set(this.getKey(moduleName, containingFile), resolvedModule);
    }

    /**
     * Deletes module from cache. Call this if a file was deleted.
     * @param resolvedModuleName full path of the module
     */
    delete(resolvedModuleName: string): void {
        this.cache.forEach((val, key) => {
            if (val.resolvedFileName === resolvedModuleName) {
                this.cache.delete(key);
            }
        });
    }

    clear() {
        this.cache.clear();
    }

    private getKey(moduleName: string, containingFile: string) {
        return containingFile + ':::' + ensureRealHamberFilePath(moduleName);
    }
}

/**
 * Creates a module loader than can also resolve `.hamber` files.
 *
 * The typescript language service tries to look up other files that are referenced in the currently open hamber file.
 * For `.ts`/`.js` files this works, for `.hamber` files it does not by default.
 * Reason: The typescript language service does not know about the `.hamber` file ending,
 * so it assumes it's a normal typescript file and searches for files like `../Component.hamber.ts`, which is wrong.
 * In order to fix this, we need to wrap typescript's module resolution and reroute all `.hamber.ts` file lookups to .hamber.
 */
export function patchModuleLoader(
    logger: Logger,
    snapshotManager: HamberSnapshotManager,
    typescript: typeof ts,
    lsHost: ts.LanguageServiceHost,
    project: ts.server.Project,
    configManager: ConfigManager
): void {
    const hamberSys = createHamberSys(logger);
    const moduleCache = new ModuleResolutionCache();
    const origResolveModuleNames = lsHost.resolveModuleNames?.bind(lsHost);

    lsHost.resolveModuleNames = resolveModuleNames;

    const origRemoveFile = project.removeFile.bind(project);
    project.removeFile = (info, fileExists, detachFromProject) => {
        logger.log('File is being removed. Delete from cache: ', info.fileName);
        moduleCache.delete(info.fileName);
        return origRemoveFile(info, fileExists, detachFromProject);
    };

    configManager.onConfigurationChanged(() => {
        moduleCache.clear();
    });

    function resolveModuleNames(
        moduleNames: string[],
        containingFile: string,
        reusedNames: string[] | undefined,
        redirectedReference: ts.ResolvedProjectReference | undefined,
        compilerOptions: ts.CompilerOptions,
        containingSourceFile?: ts.SourceFile
    ): Array<ts.ResolvedModule | undefined> {
        logger.log('Resolving modules names for ' + containingFile);
        // Try resolving all module names with the original method first.
        // The ones that are undefined will be re-checked if they are a
        // Hamber file and if so, are resolved, too. This way we can defer
        // all module resolving logic except for Hamber files to TypeScript.
        const resolved =
            origResolveModuleNames?.(
                moduleNames,
                containingFile,
                reusedNames,
                redirectedReference,
                compilerOptions,
                containingSourceFile
            ) || Array.from<undefined>(Array(moduleNames.length));

        if (!configManager.getConfig().enable) {
            return resolved;
        }

        return resolved.map((moduleName, idx) => {
            const fileName = moduleNames[idx];
            if (moduleName || !ensureRealHamberFilePath(fileName).endsWith('.hamber')) {
                return moduleName;
            }

            const cachedModule = moduleCache.get(fileName, containingFile);
            if (cachedModule) {
                return cachedModule;
            }

            const resolvedModule = resolveHamberModuleName(
                fileName,
                containingFile,
                compilerOptions
            );
            moduleCache.set(fileName, containingFile, resolvedModule);
            return resolvedModule;
        });
    }

    function resolveHamberModuleName(
        name: string,
        containingFile: string,
        compilerOptions: ts.CompilerOptions
    ): ts.ResolvedModule | undefined {
        const hamberResolvedModule = typescript.resolveModuleName(
            name,
            containingFile,
            compilerOptions,
            hamberSys
            // don't set mode or else .hamber imports couldn't be resolved
        ).resolvedModule;
        if (
            !hamberResolvedModule ||
            !isVirtualHamberFilePath(hamberResolvedModule.resolvedFileName)
        ) {
            return hamberResolvedModule;
        }

        const resolvedFileName = ensureRealHamberFilePath(hamberResolvedModule.resolvedFileName);
        logger.log('Resolved', name, 'to Hamber file', resolvedFileName);
        const snapshot = snapshotManager.create(resolvedFileName);
        if (!snapshot) {
            return undefined;
        }

        const resolvedHamberModule: ts.ResolvedModuleFull = {
            extension: snapshot.isTsFile ? typescript.Extension.Ts : typescript.Extension.Js,
            resolvedFileName
        };
        return resolvedHamberModule;
    }
}
