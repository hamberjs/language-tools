import { Node } from 'estree-walker';
import { HamberIdentifier, HamberArrayPattern, HamberObjectPattern, BaseNode } from '../interfaces';

export function isMember(parent: Node, prop: string) {
    return parent.type == 'MemberExpression' && prop == 'property';
}

export function isObjectKey(parent: Node, prop: string) {
    return parent.type == 'Property' && prop == 'key';
}

export function isObjectValue(parent: Node, prop: string) {
    return parent.type == 'Property' && prop == 'value';
}

export function isObjectValueShortHand(property: Node) {
    const { value, key } = property;
    return value && isIdentifier(value) && key.start === value.start && key.end == value.end;
}

export function isText(node: Node) {
    return node.type === 'Text';
}

export function attributeValueIsString(attr: Node) {
    return attr.value.length !== 1 || attr.value[0]?.type === 'Text';
}

export function isDestructuringPatterns(
    node: Node
): node is HamberArrayPattern | HamberObjectPattern {
    return node.type === 'ArrayPattern' || node.type === 'ObjectPattern';
}

export function isIdentifier(node: Node): node is HamberIdentifier {
    return node.type === 'Identifier';
}

export function getSlotName(child: BaseNode): string | undefined {
    const slot = (child.attributes as BaseNode[])?.find((a) => a.name == 'slot');

    return slot?.value?.[0].raw;
}
