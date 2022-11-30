import * as path from 'path';
import ts from 'typescript';
import { hamber2tsx } from './hamber2tsx';

export interface EmitDtsConfig {
    declarationDir: string;
    hamberShimsPath: string;
    libRoot?: string;
}

export async function emitDts(config: EmitDtsConfig) {
    const hamberMap = await createHamberMap(config);
    const { options, filenames } = loadTsconfig(config, hamberMap);
    const host = await createTsCompilerHost(options, hamberMap);
    const program = ts.createProgram(filenames, options, host);
    program.emit();
}

function loadTsconfig(config: EmitDtsConfig, hamberMap: HamberMap) {
    const libRoot = config.libRoot || process.cwd();

    const jsconfigFile = ts.findConfigFile(libRoot, ts.sys.fileExists, 'jsconfig.json');
    let tsconfigFile = ts.findConfigFile(libRoot, ts.sys.fileExists);

    if (!tsconfigFile && !jsconfigFile) {
        throw new Error('Failed to locate tsconfig or jsconfig');
    }

    tsconfigFile = tsconfigFile || jsconfigFile;
    if (jsconfigFile && isSubpath(path.dirname(tsconfigFile), path.dirname(jsconfigFile))) {
        tsconfigFile = jsconfigFile;
    }

    tsconfigFile = path.isAbsolute(tsconfigFile) ? tsconfigFile : path.join(libRoot, tsconfigFile);
    const basepath = path.dirname(tsconfigFile);
    const { error, config: tsConfig } = ts.readConfigFile(tsconfigFile, ts.sys.readFile);

    if (error) {
        throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
    }

    // Rewire includes and files. This ensures that only the files inside the lib are traversed and
    // that the outputted types have the correct directory depth.
    // This is a little brittle because we then may include more than the user wants
    const libPathRelative = path.relative(basepath, libRoot).split(path.sep).join('/');
    if (libPathRelative) {
        tsConfig.include = [`${libPathRelative}/**/*`];
        tsConfig.files = [];
    }

    const { options, fileNames } = ts.parseJsonConfigFileContent(
        tsConfig,
        ts.sys,
        basepath,
        { sourceMap: false },
        tsconfigFile,
        undefined,
        [{ extension: 'hamber', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]
    );

    const filenames = fileNames.map((name) => {
        if (!isHamberFilepath(name)) {
            return name;
        }
        // We need to trick TypeScript into thinking that Hamber files
        // are either TS or JS files in order to generate correct d.ts
        // definition files.
        const isTsFile = hamberMap.add(name);
        return name + (isTsFile ? '.ts' : '.js');
    });

    // Add ambient functions so TS knows how to resolve its invocations in the
    // code output of hamber2tsx.
    filenames.push(config.hamberShimsPath);

    return {
        options: {
            ...options,
            noEmit: false, // Set to true in case of jsconfig, force false, else nothing is emitted
            moduleResolution: ts.ModuleResolutionKind.NodeJs, // Classic if not set, which gives wrong results
            declaration: true, // Needed for d.ts file generation
            emitDeclarationOnly: true, // We only want d.ts file generation
            declarationDir: config.declarationDir, // Where to put the declarations
            allowNonTsExtensions: true
        },
        filenames
    };
}

async function createTsCompilerHost(options: any, hamberMap: HamberMap) {
    const host = ts.createCompilerHost(options);
    // TypeScript writes the files relative to the found tsconfig/jsconfig
    // which - at least in the case of the tests - is wrong. Therefore prefix
    // the output paths. See Typescript issue #25430 for more.
    const pathPrefix = path.relative(process.cwd(), path.dirname(options.configFilePath));

    const hamberSys: ts.System = {
        ...ts.sys,
        fileExists(originalPath) {
            const path = ensureRealHamberFilepath(originalPath);
            const exists = ts.sys.fileExists(path);
            if (exists && isHamberFilepath(path)) {
                const isTsFile = hamberMap.add(path);
                if (
                    (isTsFile && !isTsFilepath(originalPath)) ||
                    (!isTsFile && isTsFilepath(originalPath))
                ) {
                    return false;
                }
            }
            return exists;
        },
        readFile(path, encoding = 'utf-8') {
            if (isVirtualHamberFilepath(path) || isHamberFilepath(path)) {
                path = ensureRealHamberFilepath(path);
                return hamberMap.get(path);
            } else {
                return ts.sys.readFile(path, encoding);
            }
        },
        readDirectory(path, extensions, exclude, include, depth) {
            const extensionsWithHamber = (extensions || []).concat('.hamber');
            return ts.sys.readDirectory(path, extensionsWithHamber, exclude, include, depth);
        },
        writeFile(fileName, data, writeByteOrderMark) {
            return ts.sys.writeFile(
                pathPrefix ? path.join(pathPrefix, fileName) : fileName,
                data,
                writeByteOrderMark
            );
        }
    };

    host.fileExists = hamberSys.fileExists;
    host.readFile = hamberSys.readFile;
    host.readDirectory = hamberSys.readDirectory;
    host.writeFile = hamberSys.writeFile;

    host.resolveModuleNames = (
        moduleNames,
        containingFile,
        _reusedNames,
        _redirectedReference,
        compilerOptions
    ) => {
        return moduleNames.map((moduleName) => {
            return resolveModuleName(moduleName, containingFile, compilerOptions);
        });
    };

    function resolveModuleName(name: string, containingFile: string, compilerOptions: any) {
        // Delegate to the TS resolver first.
        // If that does not bring up anything, try the Hamber Module loader
        // which is able to deal with .hamber files.
        const tsResolvedModule = ts.resolveModuleName(
            name,
            containingFile,
            compilerOptions,
            ts.sys
        ).resolvedModule;
        if (tsResolvedModule && !isVirtualHamberFilepath(tsResolvedModule.resolvedFileName)) {
            return tsResolvedModule;
        }

        return ts.resolveModuleName(name, containingFile, compilerOptions, hamberSys)
            .resolvedModule;
    }

    return host;
}

interface HamberMap {
    add: (path: string) => boolean;
    get: (key: string) => string | undefined;
}

/**
 * Generates a map to which we add the transformed code of Hamber files
 * early on when we first need to look at the file contents and can read
 * those transformed source later on.
 */
async function createHamberMap(config): Promise<HamberMap> {
    const hamberFiles = new Map();

    function add(path: string): boolean {
        const code = ts.sys.readFile(path, 'utf-8');
        const isTsFile = // hamber-preprocess allows default languages
            ['ts', 'typescript'].includes(config.preprocess?.defaultLanguages?.script) ||
            /<script\s+[^>]*?lang=('|")(ts|typescript)('|")/.test(code);
        const transformed = hamber2tsx(code, {
            filename: path,
            isTsFile,
            mode: 'dts'
        }).code;
        hamberFiles.set(path, transformed);
        return isTsFile;
    }

    return { add, get: (key: string) => hamberFiles.get(key) };
}

function isHamberFilepath(filePath: string) {
    return filePath.endsWith('.hamber');
}

function isTsFilepath(filePath: string) {
    return filePath.endsWith('.ts');
}

function isVirtualHamberFilepath(filePath: string) {
    return filePath.endsWith('.hamber.ts') || filePath.endsWith('hamber.js');
}

function toRealHamberFilepath(filePath: string) {
    return filePath.slice(0, -3); // -'.js'.length || -'.ts'.length
}

function ensureRealHamberFilepath(filePath: string) {
    return isVirtualHamberFilepath(filePath) ? toRealHamberFilepath(filePath) : filePath;
}

function isSubpath(maybeParent: string, maybeChild: string) {
    const relative = path.relative(maybeParent, maybeChild);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
