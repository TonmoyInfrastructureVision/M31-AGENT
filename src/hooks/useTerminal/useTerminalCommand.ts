import * as vscode from 'vscode';
import { useLogging } from '../useLogging';
import { TerminalService } from '../../services/terminal/terminalService';
import { useExtensionContext } from '../useContext/useExtensionContext';

export interface UseTerminalCommandOptions {
    terminalName?: string;
    showTerminal?: boolean;
    closeOnComplete?: boolean;
}

export interface UseTerminalCommandResult {
    executeCommand: (command: string) => Promise<void>;
    executeCode: (code: string, languageId: string) => Promise<void>;
    runFile: (filePath: string, fileExtension: string) => Promise<void>;
    createTerminal: (name?: string) => vscode.Terminal | undefined;
    killProcess: () => Promise<void>;
    getTerminal: () => vscode.Terminal | undefined;
}

export function useTerminalCommand(
    options: UseTerminalCommandOptions = {}
): UseTerminalCommandResult {
    const logging = useLogging();
    const { context } = useExtensionContext();
    
    let terminalService: TerminalService | undefined;
    try {
        terminalService = TerminalService.getInstance();
    } catch (error) {
        if (context) {
            terminalService = TerminalService.initialize(context);
        }
    }

    async function executeCommand(command: string): Promise<void> {
        if (!terminalService) {
            logging.error('Terminal service not available');
            throw new Error('Terminal service not available');
        }

        logging.debug(`Executing terminal command: ${command}`);
        
        try {
            await terminalService.executeCommand(
                command, 
                options.terminalName
            );
            
            if (options.closeOnComplete) {
                setTimeout(() => {
                    const terminal = getTerminal();
                    terminal?.dispose();
                }, 1000);
            }
        } catch (error) {
            logging.error('Failed to execute terminal command', error);
            throw error;
        }
    }

    async function executeCode(code: string, languageId: string): Promise<void> {
        if (!terminalService) {
            logging.error('Terminal service not available');
            throw new Error('Terminal service not available');
        }

        logging.debug(`Executing ${languageId} code in terminal`);
        
        try {
            await terminalService.executeCode(code, languageId);
        } catch (error) {
            logging.error(`Failed to execute ${languageId} code in terminal`, error);
            throw error;
        }
    }

    async function runFile(filePath: string, fileExtension: string): Promise<void> {
        if (!terminalService) {
            logging.error('Terminal service not available');
            throw new Error('Terminal service not available');
        }

        logging.debug(`Running file in terminal: ${filePath}`);
        
        try {
            await terminalService.runFile(filePath, fileExtension);
        } catch (error) {
            logging.error('Failed to run file in terminal', error);
            throw error;
        }
    }

    function createTerminal(name?: string): vscode.Terminal | undefined {
        if (!terminalService) {
            logging.error('Terminal service not available');
            return undefined;
        }

        const terminalName = name || options.terminalName || 'M31 Agent';
        logging.debug(`Creating terminal: ${terminalName}`);
        
        try {
            const terminal = terminalService.createTerminal(terminalName);
            
            if (options.showTerminal) {
                terminal.show();
            }
            
            return terminal;
        } catch (error) {
            logging.error('Failed to create terminal', error);
            return undefined;
        }
    }

    async function killProcess(): Promise<void> {
        if (!terminalService) {
            logging.error('Terminal service not available');
            throw new Error('Terminal service not available');
        }

        logging.debug('Killing terminal process');
        
        try {
            await terminalService.killRunningProcess();
        } catch (error) {
            logging.error('Failed to kill terminal process', error);
            throw error;
        }
    }

    function getTerminal(): vscode.Terminal | undefined {
        const terminals = vscode.window.terminals;
        
        if (options.terminalName) {
            return terminals.find(t => t.name === options.terminalName);
        } else {
            return vscode.window.activeTerminal;
        }
    }

    return {
        executeCommand,
        executeCode,
        runFile,
        createTerminal,
        killProcess,
        getTerminal
    };
} 