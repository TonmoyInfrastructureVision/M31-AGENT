import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { TerminalService } from '../../services/terminal/terminalService';
import { registerCommand } from '../commandRegistry';

export function registerCodeExecutionCommands(context: ExtensionContext): void {
    context.loggingService.debug('Registering code execution commands');

    // Ensure terminal service is initialized
    const terminalService = TerminalService.initialize(context);

    registerCommand(
        context,
        'm31-agent.executeInTerminal',
        async (code?: string) => {
            if (!code) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    throw new Error('No active editor or code provided to execute');
                }

                if (editor.selection.isEmpty) {
                    code = editor.document.getText();
                } else {
                    code = editor.document.getText(editor.selection);
                }
            }

            if (!code.trim()) {
                throw new Error('No code to execute');
            }

            const languageId = vscode.window.activeTextEditor?.document.languageId || 'plaintext';
            
            await terminalService.executeCode(code, languageId);
            
            context.telemetryService.trackEvent('execute_code_in_terminal', {
                language: languageId,
                codeLength: code.length.toString()
            });
        }
    );

    registerCommand(
        context,
        'm31-agent.runCommand',
        async (command?: string) => {
            if (!command) {
                command = await vscode.window.showInputBox({
                    prompt: 'Enter command to run',
                    placeHolder: 'e.g., npm install'
                });
            }

            if (!command) {
                return;
            }

            if (context.configurationService.get<boolean>('requireConfirmation')) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Run command: ${command}?`,
                    { modal: false },
                    'Run'
                );

                if (confirmed !== 'Run') {
                    return;
                }
            }

            await terminalService.executeCommand(command);
            
            context.telemetryService.trackEvent('run_terminal_command', {
                commandLength: command.length.toString()
            });
        }
    );

    registerCommand(
        context,
        'm31-agent.runFile',
        async (uri?: vscode.Uri) => {
            if (!uri && vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }

            if (!uri) {
                throw new Error('No file to run');
            }

            const filePath = uri.fsPath;
            const fileExtension = filePath.split('.').pop() || '';
            
            await terminalService.runFile(filePath, fileExtension);
            
            context.telemetryService.trackEvent('run_file', {
                fileExtension
            });
        }
    );

    registerCommand(
        context,
        'm31-agent.createTerminal',
        async (name?: string) => {
            if (!name) {
                name = await vscode.window.showInputBox({
                    prompt: 'Enter terminal name',
                    placeHolder: 'Terminal name',
                    value: 'M31 Agent Terminal'
                });

                if (!name) {
                    return;
                }
            }

            const terminal = terminalService.createTerminal(name);
            terminal.show();
            
            context.telemetryService.trackEvent('create_terminal');
        }
    );

    registerCommand(
        context,
        'm31-agent.stopExecution',
        async () => {
            await terminalService.killRunningProcess();
            context.telemetryService.trackEvent('stop_execution');
        }
    );
} 