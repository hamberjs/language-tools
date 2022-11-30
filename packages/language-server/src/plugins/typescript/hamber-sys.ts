import { DocumentSnapshot } from './DocumentSnapshot';
import ts from 'typescript';
import { ensureRealHamberFilePath, isVirtualHamberFilePath, toRealHamberFilePath } from './utils';

/**
 * This should only be accessed by TS hamber module resolution.
 */
export function createHamberSys(
    getSnapshot: (fileName: string) => DocumentSnapshot,
    tsSystem: ts.System
) {
    const fileExistsCache = new Map<string, boolean>();

    const hamberSys: ts.System & { deleteFromCache: (path: string) => void } = {
        ...tsSystem,
        fileExists(path: string) {
            path = ensureRealHamberFilePath(path);
            const exists = fileExistsCache.get(path) ?? tsSystem.fileExists(path);
            fileExistsCache.set(path, exists);
            return exists;
        },
        readFile(path: string) {
            const snapshot = getSnapshot(path);
            return snapshot.getText(0, snapshot.getLength());
        },
        readDirectory(path, extensions, exclude, include, depth) {
            const extensionsWithHamber = (extensions ?? []).concat('.hamber');

            return tsSystem.readDirectory(path, extensionsWithHamber, exclude, include, depth);
        },
        deleteFile(path) {
            fileExistsCache.delete(ensureRealHamberFilePath(path));
            return tsSystem.deleteFile?.(path);
        },
        deleteFromCache(path) {
            fileExistsCache.delete(ensureRealHamberFilePath(path));
        }
    };

    if (tsSystem.realpath) {
        const realpath = tsSystem.realpath;
        hamberSys.realpath = function (path) {
            if (isVirtualHamberFilePath(path)) {
                return realpath(toRealHamberFilePath(path)) + '.ts';
            }
            return realpath(path);
        };
    }

    return hamberSys;
}
