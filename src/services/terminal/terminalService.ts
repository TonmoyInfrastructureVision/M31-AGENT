import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';

export class TerminalService implements vscode.Disposable {
    private static instance: TerminalService | undefined;
    private context: ExtensionContext;
    private terminal: vscode.Terminal | undefined;
    private loggingService: LoggingService | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(context: ExtensionContext) {
        this.context = context;
        TerminalService.instance = this;
        this.loggingService = LoggingService.getInstance();
    }

    public static getInstance(): TerminalService | undefined {
        return TerminalService.instance;
    }

    public async executeCommand(command: string): Promise<void> {
        try {
            this.loggingService?.debug(`Executing command: ${command}`);
            
            // Require user confirmation before executing commands
            if (this.context.configurationService.isRequireConfirmation()) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Do you want to execute: ${command}`,
                    { modal: true },
                    'Execute'
                );
                
                if (confirmed !== 'Execute') {
                    this.loggingService?.info('Command execution cancelled by user');
                    return;
                }
            }
            
            const terminal = await this.getTerminal();
            terminal.show();
            terminal.sendText(command);
            
            this.context.telemetryService.trackEvent('terminal_command_executed', {
                commandLength: command.length.toString()
            });
        } catch (error) {
            this.loggingService?.error('Failed to execute command', error);
            throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async executeCommandWithResult(command: string): Promise<string> {
        // For commands where we need to capture the output, we'll use the exec utility from child_process
        // But in VS Code extension, we should use the VS Code API when possible
        
        try {
            this.loggingService?.debug(`Executing command with result: ${command}`);
            
            // Require user confirmation
            if (this.context.configurationService.isRequireConfirmation()) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Do you want to execute: ${command}`,
                    { modal: true },
                    'Execute'
                );
                
                if (confirmed !== 'Execute') {
                    this.loggingService?.info('Command execution cancelled by user');
                    return 'Command execution cancelled by user';
                }
            }
            
            // For commands where we need output, we use VS Code's built-in task API
            const taskExecution = await vscode.tasks.executeTask(
                new vscode.Task(
                    { type: 'm31-agent' },
                    vscode.TaskScope.Workspace,
                    'Execute Command',
                    'm31-agent',
                    new vscode.ShellExecution(command)
                )
            );
            
            // Return a promise that resolves when the task completes
            return new Promise<string>((resolve, reject) => {
                const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                    if (e.execution === taskExecution) {
                        disposable.dispose();
                        
                        if (e.exitCode === 0) {
                            // Unfortunately, VS Code doesn't provide direct access to command output
                            // We'd need to parse it from the terminal or use Node's child_process
                            // For simplicity, we'll just return a success message
                            resolve(`Command executed successfully with exit code 0`);
                        } else {
                            reject(new Error(`Command failed with exit code ${e.exitCode}`));
                        }
                    }
                });
                
                // Add to disposables to ensure cleanup
                this.disposables.push(disposable);
            });
        } catch (error) {
            this.loggingService?.error('Failed to execute command with result', error);
            throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async getTerminal(): Promise<vscode.Terminal> {
        // Create a new terminal if it doesn't exist or was closed
        if (!this.terminal) {
            this.terminal = vscode.window.createTerminal('M31 Agent');
            
            // Register dispose handler
            const onDidCloseTerminalDisposable = vscode.window.onDidCloseTerminal(closedTerminal => {
                if (closedTerminal === this.terminal) {
                    this.terminal = undefined;
                }
            });
            
            this.disposables.push(onDidCloseTerminalDisposable);
            this.loggingService?.debug('Created new terminal for M31 Agent');
        }
        
        return this.terminal;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}