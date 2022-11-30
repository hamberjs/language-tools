import ts from 'typescript';
import { getLastPartOfPath } from '../../utils';
import { DocumentSnapshot } from './DocumentSnapshot';
import { createHamberSys } from './hamber-sys';
import {
    ensureRealHamberFilePath,
    getExtensionFromScriptKind,
    isHamberFilePath,
    isVirtualHamberFilePath,
    toVirtualHamberFilePath
} from './utils';

/**
 * Caches resolved modules.
 */
class ModuleResolutionCache {
    private cache = new Map<string, ts.ResolvedModule | undefined>();

    /**
     * Tries to get a cached module.
     * Careful: `undefined` can mean either there's no match found, or that the result resolved to `undefined`.
     */
    get(moduleName: string, containingFile: string): ts.ResolvedModule | undefined {
        return this.cache.get(this.getKey(moduleName, containingFile));
    }

    /**
     * Checks if has cached module.
     */
    has(moduleName: string, containingFile: string): boolean {
        return this.cache.has(this.getKey(moduleName, containingFile));
    }

    /**
     * Caches resolved module (or undefined).
     */
    set(moduleName: string, containingFile: string, resolvedModule: ts.ResolvedModule | undefined) {
        this.cache.set(this.getKey(moduleName, containingFile), resolvedModule);
    }

    /**
     * Deletes module from cache. Call this if a file was deleted.
     * @param resolvedModuleName full path of the module
     */
    delete(resolvedModuleName: string): void {
        this.cache.forEach((val, key) => {
            if (val?.resolvedFileName === resolvedModuleName) {
                this.cache.delete(key);
            }
        });
    }

    /**
     * Deletes everything from cache that resolved to `undefined`
     * and which might match the path.
     */
    deleteUnresolvedResolutionsFromCache(path: string): void {
        const fileNameWithoutEnding = getLastPartOfPath(path).split('.').shift() || '';
        this.cache.forEach((val, key) => {
            const moduleName = key.split(':::').pop() || '';
            if (!val && moduleName.includes(fileNameWithoutEnding)) {
                this.cache.delete(key);
            }
        });
    }

    private getKey(moduleName: string, containingFile: string) {
        return containingFile + ':::' + ensureRealHamberFilePath(moduleName);
    }
}

class ImpliedNodeFormatResolver {
    private alreadyResolved = new Map<string, ReturnType<typeof ts.getModeForResolutionAtIndex>>();

    resolve(
        importPath: string,
        importIdxInFile: number,
        sourceFile: ts.SourceFile | undefined,
        compilerOptions: ts.CompilerOptions
    ) {
        if (isHamberFilePath(importPath)) {
            // Hamber imports should use the old resolution algorithm, else they are not found
            return undefined;
        }

        let mode = undefined;
        if (sourceFile) {
            if (!sourceFile.impliedNodeFormat && isHamberFilePath(sourceFile.fileName)) {
                // impliedNodeFormat is not set for Hamber files, because the TS function which
                // calculates this works with a fixed set of file extensions,
                // which .hamber is obv not part of. Make it work by faking a TS file.
                if (!this.alreadyResolved.has(sourceFile.fileName)) {
                    sourceFile.impliedNodeFormat = ts.getImpliedNodeFormatForFile(
                        toVirtualHamberFilePath(sourceFile.fileName) as any,
                        undefined,
                        ts.sys,
                        compilerOptions
                    );
                    this.alreadyResolved.set(sourceFile.fileName, sourceFile.impliedNodeFormat);
                } else {
                    sourceFile.impliedNodeFormat = this.alreadyResolved.get(sourceFile.fileName);
                }
            }
            mode = ts.getModeForResolutionAtIndex(sourceFile, importIdxInFile);
        }
        return mode;
    }
}

/**
 * Creates a module loader specifically for `.hamber` files.
 *
 * The typescript language service tries to look up other files that are referenced in the currently open hamber file.
 * For `.ts`/`.js` files this works, for `.hamber` files it does not by default.
 * Reason: The typescript language service does not know about the `.hamber` file ending,
 * so it assumes it's a normal typescript file and searches for files like `../Component.hamber.ts`, which is wrong.
 * In order to fix this, we need to wrap typescript's module resolution and reroute all `.hamber.ts` file lookups to .hamber.
 *
 * @param getSnapshot A function which returns a (in case of hamber file fully preprocessed) typescript/javascript snapshot
 * @param compilerOptions The typescript compiler options
 */
export function createHamberModuleLoader(
    getSnapshot: (fileName: string) => DocumentSnapshot,
    compilerOptions: ts.CompilerOptions,
    tsSystem: ts.System
) {
    const hamberSys = createHamberSys(getSnapshot, tsSystem);
    const moduleCache = new ModuleResolutionCache();
    const impliedNodeFormatResolver = new ImpliedNodeFormatResolver();

    return {
        fileExists: hamberSys.fileExists,
        readFile: hamberSys.readFile,
        readDirectory: hamberSys.readDirectory,
        deleteFromModuleCache: (path: string) => {
            hamberSys.deleteFromCache(path);
            moduleCache.delete(path);
        },
        deleteUnresolvedResolutionsFromCache: (path: string) => {
            hamberSys.deleteFromCache(path);
            moduleCache.deleteUnresolvedResolutionsFromCache(path);
        },
        resolveModuleNames
    };

    function resolveModuleNames(
        moduleNames: string[],
        containingFile: string,
        _reusedNames: string[] | undefined,
        _redirectedReference: ts.ResolvedProjectReference | undefined,
        _options: ts.CompilerOptions,
        containingSourceFile?: ts.SourceFile | undefined
    ): Array<ts.ResolvedModule | undefined> {
        return moduleNames.map((moduleName, index) => {
            if (moduleCache.has(moduleName, containingFile)) {
                return moduleCache.get(moduleName, containingFile);
            }

            const resolvedModule = resolveModuleName(
                moduleName,
                containingFile,
                containingSourceFile,
                index
            );
            moduleCache.set(moduleName, containingFile, resolvedModule);
            return resolvedModule;
        });
    }

    function resolveModuleName(
        name: string,
        containingFile: string,
        containingSourceFile: ts.SourceFile | undefined,
        index: number
    ): ts.ResolvedModule | undefined {
        const mode = impliedNodeFormatResolver.resolve(
            name,
            index,
            containingSourceFile,
            compilerOptions
        );
        // Delegate to the TS resolver first.
        // If that does not bring up anything, try the Hamber Module loader
        // which is able to deal with .hamber files.
        const tsResolvedModule = ts.resolveModuleName(
            name,
            containingFile,
            compilerOptions,
            ts.sys,
            undefined,
            undefined,
            mode
        ).resolvedModule;
        if (tsResolvedModule && !isVirtualHamberFilePath(tsResolvedModule.resolvedFileName)) {
            return tsResolvedModule;
        }

        const hamberResolvedModule = ts.resolveModuleName(
            name,
            containingFile,
            compilerOptions,
            hamberSys,
            undefined,
            undefined,
            mode
        ).resolvedModule;
        if (
            !hamberResolvedModule ||
            !isVirtualHamberFilePath(hamberResolvedModule.resolvedFileName)
        ) {
            return hamberResolvedModule;
        }

        const resolvedFileName = ensureRealHamberFilePath(hamberResolvedModule.resolvedFileName);
        const snapshot = getSnapshot(resolvedFileName);

        const resolvedHamberModule: ts.ResolvedModuleFull = {
            extension: getExtensionFromScriptKind(snapshot && snapshot.scriptKind),
            resolvedFileName,
            isExternalLibraryImport: hamberResolvedModule.isExternalLibraryImport
        };
        return resolvedHamberModule;
    }
}
