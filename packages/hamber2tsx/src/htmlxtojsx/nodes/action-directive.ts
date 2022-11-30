import MagicString from 'magic-string';
import { withTrailingPropertyAccess, isQuote } from '../utils/node-utils';
import { BaseDirective, BaseNode } from '../../interfaces';

/**
 * use:xxx={params}   --->    {...__hamberts_1_ensureAction(xxx(__hamberts_1_mapElementTag('ParentNodeName'),(params)))}
 */
export function handleActionDirective(
    htmlx: string,
    str: MagicString,
    attr: BaseDirective,
    parent: BaseNode
): void {
    str.overwrite(attr.start, attr.start + 'use:'.length, '{...__hamberts_1_ensureAction(');
    const name = parent.name === 'hamber:body' ? 'body' : parent.name;

    if (!attr.expression) {
        str.appendLeft(attr.end, `(__hamberts_1_mapElementTag('${name}')))}`);
        return;
    }

    str.overwrite(
        attr.start + `use:${attr.name}`.length,
        attr.expression.start,
        `(__hamberts_1_mapElementTag('${name}'),(`
    );
    str.appendLeft(withTrailingPropertyAccess(str.original, attr.expression.end), ')))');
    const lastChar = htmlx[attr.end - 1];
    if (isQuote(lastChar)) {
        str.remove(attr.end - 1, attr.end);
    }
}
