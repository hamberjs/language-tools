import { Node } from 'estree-walker';
import { HamberIdentifier } from '../../interfaces';
import TemplateScope from './TemplateScope';
import { SlotHandler } from './slot';
import { isIdentifier, isDestructuringPatterns } from '../../utils/hamberAst';
import { extract_identifiers as extractIdentifiers } from 'periscopic';
import { Directive } from 'hamber/types/compiler/interfaces';

export function handleScopeAndResolveForSlot({
    identifierDef,
    initExpression,
    owner,
    slotHandler,
    templateScope
}: {
    identifierDef: Node;
    initExpression: Node;
    owner: Node;
    slotHandler: SlotHandler;
    templateScope: TemplateScope;
}) {
    if (isIdentifier(identifierDef)) {
        templateScope.add(identifierDef, owner);

        slotHandler.resolve(identifierDef, initExpression, templateScope);
    }
    if (isDestructuringPatterns(identifierDef)) {
        // the node object is returned as-it with no mutation
        const identifiers = extractIdentifiers(identifierDef) as HamberIdentifier[];
        templateScope.addMany(identifiers, owner);

        slotHandler.resolveDestructuringAssignment(
            identifierDef,
            identifiers,
            initExpression,
            templateScope
        );
    }
}

export function handleScopeAndResolveLetVarForSlot({
    letNode,
    component,
    slotName,
    templateScope,
    slotHandler
}: {
    letNode: Directive;
    slotName: string;
    component: Node;
    templateScope: TemplateScope;
    slotHandler: SlotHandler;
}) {
    const { expression } = letNode;
    // <Component let:a>
    if (!expression) {
        templateScope.add(letNode, component);
        slotHandler.resolveLet(letNode, letNode, component, slotName);
    } else {
        if (isIdentifier(expression)) {
            templateScope.add(expression, component);
            slotHandler.resolveLet(letNode, expression, component, slotName);
        }
        const expForExtract = { ...expression };

        if (expression.type === 'ArrayExpression') {
            expForExtract.type = 'ArrayPattern';
        } else if (expression.type === 'ObjectExpression') {
            expForExtract.type = 'ObjectPattern';
        }
        if (isDestructuringPatterns(expForExtract)) {
            const identifiers = extractIdentifiers(expForExtract) as HamberIdentifier[];
            templateScope.addMany(identifiers, component);

            slotHandler.resolveDestructuringAssignmentForLet(
                expForExtract,
                identifiers,
                letNode,
                component,
                slotName
            );
        }
    }
}
