import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export class TerminalService implements vscode.Disposable {
    private static instance: TerminalService;
    private terminal: vscode.Terminal | undefined;
    private readonly terminalName = 'M31-Agent';
    
    constructor(private readonly context: ExtensionContext) {
        TerminalService.instance = this;
    }
    
    public static getInstance(): TerminalService {
        return TerminalService.instance;
    }
    
    public async executeCommand(command: string, requireConfirmation = true): Promise<void> {
        try {
            if (requireConfirmation && this.context.configurationService.isRequireConfirmation()) {
                const result = await vscode.window.showWarningMessage(
                    `Do you want to execute the following command?\n\n${command}`,
                    { modal: true },
                    'Execute'
                );
                
                if (result !== 'Execute') {
                    this.context.loggingService.info(`User cancelled command execution: ${command}`);
                    return;
                }
            }
            
            this.getOrCreateTerminal();
            
            // Show the terminal
            this.terminal?.show(true);
            
            // Execute the command
            this.terminal?.sendText(command);
            
            this.context.loggingService.info(`Command executed in terminal: ${command}`);
            this.context.telemetryService.trackEvent('terminal_command_executed', {
                commandLength: command.length.toString()
            });
        } catch (error) {
            this.context.loggingService.error(`Failed to execute command: ${command}`, error);
            throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    public async executeCommands(commands: string[], requireConfirmation = true): Promise<void> {
        try {
            if (requireConfirmation && this.context.configurationService.isRequireConfirmation()) {
                const commandsText = commands.join('\n');
                const result = await vscode.window.showWarningMessage(
                    `Do you want to execute the following commands?\n\n${commandsText}`,
                    { modal: true },
                    'Execute'
                );
                
                if (result !== 'Execute') {
                    this.context.loggingService.info(`User cancelled commands execution`);
                    return;
                }
            }
            
            this.getOrCreateTerminal();
            
            // Show the terminal
            this.terminal?.show(true);
            
            // Execute each command
            for (const command of commands) {
                this.terminal?.sendText(command);
                
                // If there are multiple commands, add a small delay between them
                if (commands.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            this.context.loggingService.info(`Executed ${commands.length} commands in terminal`);
            this.context.telemetryService.trackEvent('terminal_commands_executed', {
                commandCount: commands.length.toString()
            });
        } catch (error) {
            this.context.loggingService.error(`Failed to execute commands`, error);
            throw new Error(`Failed to execute commands: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    private getOrCreateTerminal(): vscode.Terminal {
        // Check if our terminal exists
        if (!this.terminal) {
            // Find existing terminal with our name
            const existingTerminal = vscode.window.terminals.find(t => t.name === this.terminalName);
            
            if (existingTerminal) {
                this.terminal = existingTerminal;
            } else {
                // Create a new terminal
                this.terminal = vscode.window.createTerminal({
                    name: this.terminalName,
                    hideFromUser: false
                });
                
                // Register terminal close event
                vscode.window.onDidCloseTerminal(terminal => {
                    if (terminal.name === this.terminalName && terminal === this.terminal) {
                        this.terminal = undefined;
                    }
                }, this, this.context.subscriptions);
            }
        }
        
        return this.terminal;
    }
    
    public dispose(): void {
        this.terminal?.dispose();
        this.terminal = undefined;
    }
}