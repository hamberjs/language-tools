import MagicString from 'magic-string';
import { BaseNode } from '../../interfaces';

/**
 * `<hamber:window>...</hamber:window>`   ---->    `<hamberwindow>...</hamberwindow>`
 * (same for :head, :body, :options, :fragment, :element)
 */
export function handleHamberTag(htmlx: string, str: MagicString, node: BaseNode): void {
    const colon = htmlx.indexOf(':', node.start);
    str.remove(colon, colon + 1);

    const closeTag = htmlx.lastIndexOf('/' + node.name, node.end);
    if (closeTag > node.start) {
        const colon = htmlx.indexOf(':', closeTag);
        str.remove(colon, colon + 1);
    }
}
