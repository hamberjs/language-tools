import { BaseDirective } from '../../interfaces';
import { Element } from './Element';

/**
 * use:xxx={params}   --->    __hamberts_2_ensureAction(xxx(hamber.mapElementTag('ParentNodeName'),(params)));
 */
export function handleActionDirective(attr: BaseDirective, element: Element): void {
    element.addAction(attr);
}
