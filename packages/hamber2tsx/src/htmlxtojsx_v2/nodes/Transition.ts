import MagicString from 'magic-string';
import { BaseDirective } from '../../interfaces';
import {
    getDirectiveNameStartEndIdx,
    rangeWithTrailingPropertyAccess,
    TransformationArray
} from '../utils/node-utils';
import { Element } from './Element';

/**
 * transition|modifier:xxx(yyy)   --->   __hamberts_2_ensureTransition(xxx(hamber.mapElementTag('..'),(yyy)));
 */
export function handleTransitionDirective(
    str: MagicString,
    attr: BaseDirective,
    element: Element
): void {
    const transformations: TransformationArray = [
        '__hamberts_2_ensureTransition(',
        getDirectiveNameStartEndIdx(str, attr),
        `(${element.typingsNamespace}.mapElementTag('${element.tagName}')`
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
