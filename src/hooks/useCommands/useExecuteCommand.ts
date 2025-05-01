import * as vscode from 'vscode';
import { useLogging } from '../useLogging';

export interface UseExecuteCommandResult {
    executeCommand: <T>(command: string, ...args: any[]) => Promise<T | undefined>;
    executeCommandWithProgress: <T>(
        command: string, 
        progressTitle: string, 
        ...args: any[]
    ) => Promise<T | undefined>;
}

export function useExecuteCommand(): UseExecuteCommandResult {
    const logging = useLogging();

    async function executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined> {
        try {
            logging.debug(`Executing command: ${command}`, { args });
            return await vscode.commands.executeCommand<T>(command, ...args);
        } catch (error) {
            logging.error(`Failed to execute command: ${command}`, error);
            throw error;
        }
    }

    async function executeCommandWithProgress<T>(
        command: string,
        progressTitle: string,
        ...args: any[]
    ): Promise<T | undefined> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: progressTitle,
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0 });
                
                try {
                    logging.debug(`Executing command with progress: ${command}`, { args });
                    
                    progress.report({ increment: 50, message: 'Running...' });
                    const result = await vscode.commands.executeCommand<T>(command, ...args);
                    
                    progress.report({ increment: 50, message: 'Complete' });
                    return result;
                } catch (error) {
                    logging.error(`Failed to execute command with progress: ${command}`, error);
                    throw error;
                }
            }
        );
    }

    return {
        executeCommand,
        executeCommandWithProgress
    };
} 