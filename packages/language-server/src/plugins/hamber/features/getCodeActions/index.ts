import {
    CodeAction,
    CodeActionContext,
    CodeActionKind,
    Range,
    WorkspaceEdit
} from 'vscode-languageserver';
import { HamberDocument } from '../../HamberDocument';
import { getQuickfixActions, isIgnorableHamberDiagnostic } from './getQuickfixes';
import { executeRefactoringCommand } from './getRefactorings';

export async function getCodeActions(
    hamberDoc: HamberDocument,
    range: Range,
    context: CodeActionContext
): Promise<CodeAction[]> {
    const hamberDiagnostics = context.diagnostics.filter(isIgnorableHamberDiagnostic);
    if (
        hamberDiagnostics.length &&
        (!context.only || context.only.includes(CodeActionKind.QuickFix))
    ) {
        return await getQuickfixActions(hamberDoc, hamberDiagnostics);
    }

    return [];
}

export async function executeCommand(
    hamberDoc: HamberDocument,
    command: string,
    args?: any[]
): Promise<WorkspaceEdit | string | null> {
    return await executeRefactoringCommand(hamberDoc, command, args);
}
