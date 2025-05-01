import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';

// Import command registration functions
import { RegisterConfigureSettingsCommand } from './ui/configureSettingsCommand';
import { RegisterExplainCodeCommand } from './codeGeneration/explainCodeCommand';
import { RegisterGenerateCodeCommand } from './codeGeneration/generateCodeCommand';
import { RegisterRunCommandCommand } from './terminal/runCommandCommand';
import { RegisterNavigateCodebaseCommand } from './fileSystem/navigateCodebaseCommand';

export interface CommandDependencies {
    statusBarManager: StatusBarManager;
    chatPanelProvider: ChatPanelProvider;
}

export function registerAllCommands(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    context.loggingService.info('Registering extension commands');

    // Show chat command
    const showChatCommand = vscode.commands.registerCommand('m31-agent.showChat', () => {
        dependencies.chatPanelProvider.show();
    });
    context.registerDisposable(showChatCommand);

    // Register UI commands
    RegisterConfigureSettingsCommand(context, dependencies);

    // Register code generation commands
    RegisterExplainCodeCommand(context, dependencies);
    RegisterGenerateCodeCommand(context, dependencies);

    // Register terminal commands
    RegisterRunCommandCommand(context, dependencies);

    // Register file system commands
    RegisterNavigateCodebaseCommand(context, dependencies);

    // Register keyboard shortcut commands
    registerKeyboardShortcuts(context, dependencies);

    context.loggingService.info('All commands registered successfully');
}

function registerKeyboardShortcuts(context: ExtensionContext, dependencies: CommandDependencies): void {
    // Quick chat command with keyboard shortcut (bound in package.json to e.g., Ctrl+Alt+M)
    const quickChatCommand = vscode.commands.registerCommand('m31-agent.quickChat', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            dependencies.chatPanelProvider.show();
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (selectedText) {
            dependencies.chatPanelProvider.show();
            // TODO: Send selected text to chat when API available
        } else {
            const userPrompt = await vscode.window.showInputBox({
                prompt: 'What can I help you with?',
                placeHolder: 'Ask a question or request code help...'
            });

            if (userPrompt) {
                dependencies.chatPanelProvider.show();
                // TODO: Send prompt to chat when API available
            }
        }
    });
    context.registerDisposable(quickChatCommand);
} 