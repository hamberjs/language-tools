import { ArrayPattern, Identifier, ObjectPattern, Node } from 'estree';
import { DirectiveType, TemplateNode } from 'hamber/types/compiler/interfaces';

export interface NodeRange {
    start: number;
    end: number;
}

export interface HamberIdentifier extends Identifier, NodeRange {}

export interface HamberArrayPattern extends ArrayPattern, NodeRange {}

export interface HamberObjectPattern extends ObjectPattern, NodeRange {}

export interface WithName {
    type: string;
    name: string;
}

export interface ConstTag extends NodeRange {
    type: 'ConstTag';
    expression: any;
}

// Copied from the Hamber type definitions
export interface BaseNode {
    start: number;
    end: number;
    type: string;
    children?: TemplateNode[];
    [prop_name: string]: any;
}

export interface BaseDirective extends BaseNode {
    type: DirectiveType;
    expression: null | Node;
    name: string;
    modifiers: string[];
}

export interface Attribute extends BaseNode {
    value: BaseNode[] | true;
}

export interface StyleDirective extends BaseNode {
    value: BaseNode[] | true;
}
