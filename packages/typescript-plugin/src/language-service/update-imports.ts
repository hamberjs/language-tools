import path from 'path';
import type ts from 'typescript/lib/tsserverlibrary';
import { Logger } from '../logger';
import { HamberSnapshotManager } from '../hamber-snapshots';
import { isHamberFilePath } from '../utils';

export function decorateUpdateImports(
    ls: ts.LanguageService,
    snapshotManager: HamberSnapshotManager,
    logger: Logger
): void {
    const getEditsForFileRename = ls.getEditsForFileRename;
    ls.getEditsForFileRename = (oldFilePath, newFilePath, formatOptions, preferences) => {
        const renameLocations = getEditsForFileRename(
            oldFilePath,
            newFilePath,
            formatOptions,
            preferences
        );
        return renameLocations
            ?.filter((renameLocation) => {
                // If a file move/rename of a TS/JS file results a Hamber file change,
                // the Hamber extension will notice that, too, and adjusts the same imports.
                // This results in duplicate adjustments or race conditions with conflicting text spans
                // which can break imports in some cases.
                // Therefore don't do any updates of Hamber files and and also no updates of mixed TS files
                // and let the Hamber extension handle that.
                return (
                    !isHamberFilePath(renameLocation.fileName) &&
                    !renameLocation.textChanges.some((change) => change.newText.endsWith('.hamber'))
                );
            })
            .map((renameLocation) => {
                if (path.basename(renameLocation.fileName).startsWith('+')) {
                    // Filter out changes to './$type' imports for Kit route files,
                    // you'll likely want these to stay as-is
                    renameLocation.textChanges = renameLocation.textChanges.filter((change) => {
                        return !change.newText.includes('.hamber-kit/types/');
                    });
                }
                return renameLocation;
            });
    };
}
