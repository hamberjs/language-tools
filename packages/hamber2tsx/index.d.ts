export interface HamberCompiledToTsx {
    code: string;
    map: import("magic-string").SourceMap;
    exportedNames: IExportedNames;
    events: ComponentEvents;
}

export interface IExportedNames {
    has(name: string): boolean;
}

export interface ComponentEvents {
    getAll(): { name: string; type: string; doc?: string }[];
}

export function hamber2tsx(
    hamber: string,
    options?: {
        /**
         * Path of the file
         */
        filename?: string;
        /**
         * If the given file uses TypeScript inside script.
         * This cannot be inferred from `hamber2tsx` by looking
         * at the attributes of the script tag because the
         * user may have set a default-language through
         * `hamber-preprocess`.
         */
        isTsFile?: boolean;
        /**
         * Whether to try emitting result when there's a syntax error in the template
         */
        emitOnTemplateError?: boolean;
        /**
         * The namespace option from hamber config
         * see https://hamberjs.web.app/docs#hamber_compile for more info
         */
        namespace?: string;
        /**
         * When setting this to 'dts', all tsx/jsx code and the template code will be thrown out.
         * Only the `code` property will be set on the returned element.
         * Use this as an intermediate step to generate type definitions from a component.
         * It is expected to pass the result to TypeScript which should handle emitting the d.ts files.
         * The shims need to be provided by the user ambient-style,
         * for example through `filenames.push(require.resolve('hamber2tsx/hamber-shims.d.ts'))`.
         * If you pass 'ts', it uses the new transformation which will replace the now deprecated 'tsx'
         * transformation soon.
         */
        mode?: 'ts' | 'tsx' | 'dts',
        /**
         * Takes effect when using the new 'ts' mode. Default 'hamberHTML'.
         * Tells hamber2tsx from which namespace some specific functions to use.
         *
         * Example: 'hamberHTML' -> hamberHTML.createElement<..>(..)
         *
         * A namespace needs to implement the following functions:
         * - `createElement(str: string, validAttributes: ..): Element`
         * - `mapElementTag<Key extends keyof YourElements>(str: Key): YourElements[Key]`
         */
        typingsNamespace?: string;
        /**
         * The accessor option from hamber config.
         * Would be overridden by the same config in the hamber:option element if exist
         * see https://hamberjs.web.app/docs#hamber_compile for more info
         */
        accessors?: boolean
    }
): HamberCompiledToTsx

export interface EmitDtsConfig {
    /**
     * Where to output the declaration files
     */
    declarationDir: string;
    /**
     * Path to `hamber-shims.d.ts` of `hamber2tsx`.
     * Example: `require.resolve('hamber2tsx/hamber-shims.d.ts')`
     */
    hamberShimsPath: string;
    /**
     * If you want to emit types only for part of your project,
     * then set this to the folder for which the types should be emitted.
     * Most of the time you don't need this. For HamberKit, this is for example
     * set to `src/lib` by default.
     */
    libRoot?: string;
}

// to make typo fix non-breaking, continue to export the old name but mark it as deprecated
/**@deprecated*/
export interface EmitDtsConig extends EmitDtsConfig {} /* eslint-disable-line @typescript-eslint/no-empty-interface */

/**
 * Searches for a jsconfig or tsconfig starting at `root` and emits d.ts files
 * into `declarationDir` using the ambient file from `hamberShimsPath`.
 * Note: Handwritten `d.ts` files are not copied over; TypeScript does not
 * touch these files.
 */
export function emitDts(config: EmitDtsConfig): Promise<void>;
