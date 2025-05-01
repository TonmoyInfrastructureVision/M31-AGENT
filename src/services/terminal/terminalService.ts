import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';

export interface TerminalCommand {
    command: string;
    description: string;
    timestamp: number;
    workingDirectory?: string;
    status: 'success' | 'error' | 'pending';
    output?: string;
}

export class TerminalService implements vscode.Disposable {
    private static instance: TerminalService | undefined;
    private context: ExtensionContext;
    private terminal: vscode.Terminal | undefined;
    private loggingService: LoggingService | undefined;
    private commandHistory: TerminalCommand[] = [];
    private static readonly MAX_HISTORY_SIZE = 100;
    private disposables: vscode.Disposable[] = [];
    private subscriptions: vscode.Disposable[] = [];

    constructor(context: ExtensionContext) {
        this.context = context;
        TerminalService.instance = this;
        this.loggingService = LoggingService.getInstance();
    }

    public static getInstance(): TerminalService | undefined {
        return TerminalService.instance;
    }

    public async initialize(): Promise<void> {
        this.loggingService?.info('Initializing terminal service');
        
        // Load command history from workspace state
        this.loadCommandHistory();
        
        // Listen for terminal close events
        const terminalCloseListener = vscode.window.onDidCloseTerminal(terminal => {
            if (terminal === this.terminal) {
                this.terminal = undefined;
                this.loggingService?.debug('Terminal closed');
            }
        });
        
        this.subscriptions.push(terminalCloseListener);
        
        this.loggingService?.info('Terminal service initialized');
    }

    public async executeCommand(command: string, description: string = ''): Promise<void> {
        await this.ensureTerminalExists();

        if (!this.terminal) {
            throw new Error('Failed to create terminal');
        }

        // Show the terminal
        this.terminal.show();

        // Record command in history
        const terminalCommand: TerminalCommand = {
            command,
            description: description || command,
            timestamp: Date.now(),
            workingDirectory: await this.getCurrentWorkingDirectory(),
            status: 'pending'
        };

        this.commandHistory.unshift(terminalCommand);
        this.trimCommandHistory();
        this.saveCommandHistory();

        // Execute the command
        this.terminal.sendText(command);
        
        // Track telemetry
        this.context.telemetryService.trackEvent('terminal_command_executed', {
            commandLength: command.length.toString()
        });
    }

    public async createTerminal(name: string = 'M31 Agent'): Promise<vscode.Terminal> {
        // Close existing terminal if it exists
        if (this.terminal) {
            this.terminal.dispose();
        }

        // Create a new terminal
        this.terminal = vscode.window.createTerminal(name);
        
        // Track telemetry
        this.context.telemetryService.trackEvent('terminal_created', {
            name
        });
        
        return this.terminal;
    }

    private async ensureTerminalExists(): Promise<void> {
        if (!this.terminal) {
            this.terminal = await this.createTerminal();
        }
    }

    private async getCurrentWorkingDirectory(): Promise<string | undefined> {
        try {
            // This is difficult to get reliably, so we'll return undefined for now
            // In a real implementation, we might execute a command like 'pwd' and capture the output
            return undefined;
        } catch (error) {
            this.loggingService?.error('Failed to get current working directory', error);
            return undefined;
        }
    }

    public getCommandHistory(): TerminalCommand[] {
        return [...this.commandHistory];
    }

    private trimCommandHistory(): void {
        if (this.commandHistory.length > TerminalService.MAX_HISTORY_SIZE) {
            this.commandHistory = this.commandHistory.slice(0, TerminalService.MAX_HISTORY_SIZE);
        }
    }

    private loadCommandHistory(): void {
        try {
            const storedHistory = this.context.workspaceState.get<TerminalCommand[]>('m31-agent.terminalCommandHistory');
            if (storedHistory) {
                this.commandHistory = storedHistory;
                this.loggingService?.debug(`Loaded ${storedHistory.length} terminal commands from history`);
            }
        } catch (error) {
            this.loggingService?.error('Failed to load terminal command history', error);
        }
    }

    private saveCommandHistory(): void {
        try {
            this.context.workspaceState.update('m31-agent.terminalCommandHistory', this.commandHistory);
        } catch (error) {
            this.loggingService?.error('Failed to save terminal command history', error);
        }
    }

    public async clearCommandHistory(): Promise<void> {
        this.commandHistory = [];
        await this.saveCommandHistory();
        this.loggingService?.debug('Terminal command history cleared');
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
        
        this.subscriptions.forEach(s => s.dispose());
        this.subscriptions = [];
    }
}