import ts from 'typescript';
import { Logger } from './logger';
import { ensureRealHamberFilePath, isVirtualHamberFilePath, toRealHamberFilePath } from './utils';

/**
 * This should only be accessed by TS hamber module resolution.
 */
export function createHamberSys(logger: Logger) {
    const hamberSys: ts.System = {
        ...ts.sys,
        fileExists(path: string) {
            return ts.sys.fileExists(ensureRealHamberFilePath(path));
        },
        readDirectory(path, extensions, exclude, include, depth) {
            const extensionsWithHamber = (extensions ?? []).concat('.hamber');

            return ts.sys.readDirectory(path, extensionsWithHamber, exclude, include, depth);
        }
    };

    if (ts.sys.realpath) {
        const realpath = ts.sys.realpath;
        hamberSys.realpath = function (path) {
            if (isVirtualHamberFilePath(path)) {
                return realpath(toRealHamberFilePath(path)) + '.ts';
            }
            return realpath(path);
        };
    }

    return hamberSys;
}
