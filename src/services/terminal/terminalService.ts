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

export class TerminalService {
    private static instance: TerminalService;
    private context: ExtensionContext;
    private terminal: vscode.Terminal | undefined;
    private terminals: Map<string, vscode.Terminal> = new Map();
    private runningProcesses: Map<string, vscode.Terminal> = new Map();
    private loggingService: LoggingService | undefined;
    private commandHistory: TerminalCommand[] = [];
    private static readonly MAX_HISTORY_SIZE = 100;
    private disposables: vscode.Disposable[] = [];
    private subscriptions: vscode.Disposable[] = [];

    private constructor(context: ExtensionContext) {
        this.context = context;
        TerminalService.instance = this;
        this.loggingService = LoggingService.getInstance();
    }

    public static getInstance(): TerminalService {
        if (!TerminalService.instance) {
            throw new Error('TerminalService not initialized');
        }
        return TerminalService.instance;
    }

    public static initialize(context: ExtensionContext): TerminalService {
        TerminalService.instance = new TerminalService(context);
        context.loggingService.debug('Terminal service initialized');
        return TerminalService.instance;
    }

    public createTerminal(name: string = 'M31 Agent'): vscode.Terminal {
        this.context.loggingService.debug(`Creating terminal: ${name}`);
        
        const terminal = vscode.window.createTerminal(name);
        this.terminals.set(name, terminal);
        
        return terminal;
    }

    public async executeCommand(command: string, terminalName?: string): Promise<void> {
        this.context.loggingService.debug(`Executing command: ${command}`);
        
        let terminal: vscode.Terminal;
        
        if (terminalName && this.terminals.has(terminalName)) {
            terminal = this.terminals.get(terminalName)!;
        } else {
            terminal = vscode.window.activeTerminal || 
                this.terminal || 
                this.createTerminal();
            
            this.terminal = terminal;
        }
        
        terminal.show();
        terminal.sendText(command);
        
        this.runningProcesses.set(command, terminal);
        
        return new Promise<void>(resolve => {
            setTimeout(() => {
                this.runningProcesses.delete(command);
                resolve();
            }, 100);
        });
    }

    public async executeCode(code: string, languageId: string): Promise<void> {
        this.context.loggingService.debug(`Executing ${languageId} code snippet`);
        
        switch (languageId) {
            case 'javascript':
            case 'typescript':
                return this.executeJavaScript(code);
                
            case 'python':
                return this.executePython(code);
                
            case 'shellscript':
            case 'bash':
                return this.executeShellScript(code);
                
            default:
                throw new Error(`Executing ${languageId} code is not supported`);
        }
    }

    private async executeJavaScript(code: string): Promise<void> {
        const tempFile = await this.createTempFile(code, 'js');
        return this.executeCommand(`node "${tempFile}"`);
    }

    private async executePython(code: string): Promise<void> {
        const tempFile = await this.createTempFile(code, 'py');
        return this.executeCommand(`python "${tempFile}"`);
    }

    private async executeShellScript(code: string): Promise<void> {
        const tempFile = await this.createTempFile(code, 'sh');
        return this.executeCommand(`chmod +x "${tempFile}" && "${tempFile}"`);
    }

    private async createTempFile(content: string, extension: string): Promise<string> {
        const fs = vscode.workspace.fs;
        const tempDir = vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.parse('file:///tmp'), '.m31-temp');
        
        try {
            await fs.createDirectory(tempDir);
        } catch (error) {
            this.context.loggingService.debug('Temp directory already exists');
        }
        
        const timestamp = new Date().getTime();
        const fileName = `m31_${timestamp}.${extension}`;
        const fileUri = vscode.Uri.joinPath(tempDir, fileName);
        
        const encoder = new TextEncoder();
        await fs.writeFile(fileUri, encoder.encode(content));
        
        return fileUri.fsPath;
    }

    public async runFile(filePath: string, fileExtension: string): Promise<void> {
        this.context.loggingService.debug(`Running file: ${filePath}`);
        
        let command: string;
        
        switch (fileExtension.toLowerCase()) {
            case 'js':
                command = `node "${filePath}"`;
                break;
                
            case 'ts':
                command = `ts-node "${filePath}"`;
                break;
                
            case 'py':
                command = `python "${filePath}"`;
                break;
                
            case 'sh':
            case 'bash':
                command = `chmod +x "${filePath}" && "${filePath}"`;
                break;
                
            case 'java':
                command = `javac "${filePath}" && java "${filePath.replace('.java', '')}"`;
                break;
                
            case 'cpp':
            case 'cc':
                command = `g++ "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
                break;
                
            case 'c':
                command = `gcc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
                break;
                
            case 'go':
                command = `go run "${filePath}"`;
                break;
                
            case 'rb':
                command = `ruby "${filePath}"`;
                break;
                
            case 'php':
                command = `php "${filePath}"`;
                break;
                
            default:
                throw new Error(`Running files with extension .${fileExtension} is not supported`);
        }
        
        return this.executeCommand(command);
    }

    public killRunningProcess(): Promise<void> {
        this.context.loggingService.debug('Attempting to kill running process');
        
        if (vscode.window.activeTerminal) {
            vscode.window.activeTerminal.sendText('\u0003'); // Ctrl+C
            return Promise.resolve();
        }
        
        return Promise.resolve();
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
        
        this.terminals.forEach(terminal => terminal.dispose());
        this.terminals.clear();
        this.runningProcesses.clear();
        TerminalService.instance = undefined as any;
    }
}