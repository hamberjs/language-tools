import MagicString from 'magic-string';
import { BaseDirective } from '../../interfaces';
import {
    getDirectiveNameStartEndIdx,
    rangeWithTrailingPropertyAccess,
    TransformationArray
} from '../utils/node-utils';
import { Element } from './Element';

/**
 * animate:xxx(yyy)   --->   __hamberts_2_ensureAnimation(xxx(hamber.mapElementTag('..'),__hamberts_2_AnimationMove,(yyy)));
 */
export function handleAnimateDirective(
    str: MagicString,
    attr: BaseDirective,
    element: Element
): void {
    const transformations: TransformationArray = [
        '__hamberts_2_ensureAnimation(',
        getDirectiveNameStartEndIdx(str, attr),
        `(${element.typingsNamespace}.mapElementTag('${element.tagName}'),__hamberts_2_AnimationMove`
    ];
    if (attr.expression) {
        transformations.push(
            ',(',
            rangeWithTrailingPropertyAccess(str.original, attr.expression),
            ')'
        );
    }
    transformations.push('));');
    element.appendToStartEnd(transformations);
}
