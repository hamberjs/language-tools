import { basename, dirname } from 'path';
import type ts from 'typescript/lib/tsserverlibrary';
import { Logger } from '../logger';
import { isHamberFilePath, replaceDeep } from '../utils';

const componentPostfix = '__HamberComponent_';

export function decorateCompletions(ls: ts.LanguageService, logger: Logger): void {
    const getCompletionsAtPosition = ls.getCompletionsAtPosition;
    ls.getCompletionsAtPosition = (fileName, position, options) => {
        const completions = getCompletionsAtPosition(fileName, position, options);
        if (!completions) {
            return completions;
        }

        // Add ./$types imports for HamberKit since TypeScript is bad at it
        if (basename(fileName).startsWith('+')) {
            const $typeImports = new Map<string, ts.CompletionEntry>();
            for (const c of completions.entries) {
                if (c.source?.includes('.hamber-kit/types') && c.data) {
                    $typeImports.set(c.name, c);
                }
            }
            for (const $typeImport of $typeImports.values()) {
                // resolve path from FileName to hamber-kit/types
                // src/routes/foo/+page.hamber -> .hamber-kit/types/foo/$types.d.ts
                const routesFolder = 'src/routes'; // TODO somehow get access to kit.files.routes in here
                const relativeFileName = fileName.split(routesFolder)[1]?.slice(1);

                if (relativeFileName) {
                    const relativePath =
                        dirname(relativeFileName) === '.' ? '' : `${dirname(relativeFileName)}/`;
                    const modifiedSource =
                        $typeImport.source!.split('.hamber-kit/types')[0] +
                        // note the missing .d.ts at the end - TS wants it that way for some reason
                        `.hamber-kit/types/${routesFolder}/${relativePath}$types`;
                    completions.entries.push({
                        ...$typeImport,
                        // Ensure it's sorted above the other imports
                        sortText: !isNaN(Number($typeImport.sortText))
                            ? String(Number($typeImport.sortText) - 1)
                            : $typeImport.sortText,
                        source: modifiedSource,
                        data: {
                            ...$typeImport.data,
                            fileName: $typeImport.data!.fileName?.replace(
                                $typeImport.source!,
                                modifiedSource
                            ),
                            moduleSpecifier: $typeImport.data!.moduleSpecifier?.replace(
                                $typeImport.source!,
                                modifiedSource
                            ),
                            __is_hamberkit$typeImport: true
                        } as any
                    });
                }
            }
        }

        return {
            ...completions,
            entries: completions.entries.map((entry) => {
                if (
                    !isHamberFilePath(entry.source || '') ||
                    !entry.name.endsWith(componentPostfix)
                ) {
                    return entry;
                }
                return {
                    ...entry,
                    name: entry.name.slice(0, -componentPostfix.length)
                };
            })
        };
    };

    const getCompletionEntryDetails = ls.getCompletionEntryDetails;
    ls.getCompletionEntryDetails = (
        fileName,
        position,
        entryName,
        formatOptions,
        source,
        preferences,
        data
    ) => {
        const is$typeImport = (data as any)?.__is_hamberkit$typeImport;

        const details = getCompletionEntryDetails(
            fileName,
            position,
            entryName,
            formatOptions,
            source,
            preferences,
            data
        );

        if (details) {
            if (is$typeImport) {
                details.codeActions = details.codeActions?.map((codeAction) => {
                    codeAction.description = adjustPath(codeAction.description);
                    codeAction.changes = codeAction.changes.map((change) => {
                        change.textChanges = change.textChanges.map((textChange) => {
                            textChange.newText = adjustPath(textChange.newText);
                            return textChange;
                        });
                        return change;
                    });
                    return codeAction;
                });
                return details;
            } else if (isHamberFilePath(source || '')) {
                logger.debug('TS found Hamber Component import completion details');
                return replaceDeep(details, componentPostfix, '');
            } else {
                return details;
            }
        }
        if (!isHamberFilePath(source || '')) {
            return details;
        }

        // In the completion list we removed the component postfix. Internally,
        // the language service saved the list with the postfix, so details
        // won't match anything. Therefore add it back and remove it afterwards again.
        const hamberDetails = getCompletionEntryDetails(
            fileName,
            position,
            entryName + componentPostfix,
            formatOptions,
            source,
            preferences,
            data
        );
        if (!hamberDetails) {
            return undefined;
        }
        logger.debug('Found Hamber Component import completion details');

        return replaceDeep(hamberDetails, componentPostfix, '');
    };
}

function adjustPath(path: string) {
    return path.replace(
        /(['"])(.+?)['"]/,
        // .js logic for node16 module resolution
        (_match, quote, path) => `${quote}./$types${path.endsWith('.js') ? '.js' : ''}${quote}`
    );
}
