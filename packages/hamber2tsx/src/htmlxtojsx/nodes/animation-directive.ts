import MagicString from 'magic-string';
import { withTrailingPropertyAccess, isQuote } from '../utils/node-utils';
import { BaseDirective, BaseNode } from '../../interfaces';

/**
 * animate:xxx(yyy)   --->   {...__hamberts_1_ensureAnimation(xxx(__hamberts_1_mapElementTag('..'),__hamberts_1_AnimationMove,(yyy)))}
 */
export function handleAnimateDirective(
    htmlx: string,
    str: MagicString,
    attr: BaseDirective,
    parent: BaseNode
): void {
    str.overwrite(
        attr.start,
        htmlx.indexOf(':', attr.start) + 1,
        '{...__hamberts_1_ensureAnimation('
    );

    const nodeType = `__hamberts_1_mapElementTag('${parent.name}')`;

    if (!attr.expression) {
        str.appendLeft(attr.end, `(${nodeType},__hamberts_1_AnimationMove,{}))}`);
        return;
    }
    str.overwrite(
        htmlx.indexOf(':', attr.start) + 1 + `${attr.name}`.length,
        attr.expression.start,
        `(${nodeType},__hamberts_1_AnimationMove,(`
    );
    str.appendLeft(withTrailingPropertyAccess(str.original, attr.expression.end), ')))');
    if (isQuote(htmlx[attr.end - 1])) {
        str.remove(attr.end - 1, attr.end);
    }
}
