import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { RegisterShowChatPanelCommand } from './ui/showChatPanelCommand';
import { RegisterGenerateCodeCommand } from './codeGeneration/generateCodeCommand';
import { RegisterExplainCodeCommand } from './codeGeneration/explainCodeCommand';
import { RegisterRunCommandCommand } from './terminal/runCommandCommand';
import { RegisterNavigateCodebaseCommand } from './fileSystem/navigateCodebaseCommand';
import { RegisterConfigureSettingsCommand } from './ui/configureSettingsCommand';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';

export interface CommandDependencies {
    statusBarManager: StatusBarManager;
    chatPanelProvider: ChatPanelProvider;
}

export function registerAllCommands(context: ExtensionContext, dependencies: CommandDependencies): void {
    context.loggingService.info('Registering commands');
    
    // Register UI commands
    RegisterShowChatPanelCommand(context, dependencies);
    RegisterConfigureSettingsCommand(context);
    
    // Register code generation commands
    RegisterGenerateCodeCommand(context, dependencies);
    RegisterExplainCodeCommand(context, dependencies);
    
    // Register terminal commands
    RegisterRunCommandCommand(context, dependencies);
    
    // Register file system commands
    RegisterNavigateCodebaseCommand(context, dependencies);
    
    // Track command usage
    registerCommandTracking(context);
    
    context.loggingService.info('All commands registered');
}

function registerCommandTracking(context: ExtensionContext): void {
    // Register wrapper around executeCommand to track command usage
    const originalExecuteCommand = vscode.commands.executeCommand;
    
    // Override executeCommand to track command usage for our extension's commands
    vscode.commands.executeCommand = function<T>(command: string, ...rest: any[]): Thenable<T> {
        if (command.startsWith('m31-agent.')) {
            context.telemetryService.trackCommandUsage(command);
        }
        
        return originalExecuteCommand.apply(vscode.commands, [command, ...rest]);
    };
    
    // Restore original when extension is deactivated
    context.registerDisposable({
        dispose: () => {
            vscode.commands.executeCommand = originalExecuteCommand;
        }
    });
} 