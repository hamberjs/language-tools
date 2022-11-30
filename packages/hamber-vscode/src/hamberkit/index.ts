import { ExtensionContext } from 'vscode';
import { addGenerateKitRouteFilesCommand } from './generateFiles';

export function setupHamberKit(context: ExtensionContext) {
    addGenerateKitRouteFilesCommand(context);
}
