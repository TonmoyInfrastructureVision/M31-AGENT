import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { FileSystemService } from '../../services/fileSystem/fileSystemService';
import { IOpenRouterCompletionRequest, IOpenRouterMessage } from '../../api/interfaces/requests/completionRequest';
import { CodeAnalysisService, SearchResult } from '../../services/codeAnalysis/codeAnalysisService';

export function RegisterNavigateCodebaseCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.navigateCodebase', async () => {
        try {
            // Show status bar as busy
            dependencies.statusBarManager.showBusy('Analyzing codebase');
            
            // Get input from user
            const promptText = await vscode.window.showInputBox({
                prompt: 'What are you looking for in the codebase?',
                placeHolder: 'Find files related to...',
                ignoreFocusOut: true
            });
            
            if (!promptText) {
                dependencies.statusBarManager.showReady();
                return;
            }
            
            // Get workspace context
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showInformationMessage('No workspace folder is open');
                dependencies.statusBarManager.showReady();
                return;
            }
            
            // Get file system service
            const fileSystemService = FileSystemService.getInstance();
            
            // Get code analysis service
            const codeAnalysisService = CodeAnalysisService.getInstance();
            
            // Gather workspace information
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const fileCount = await countFiles(fileSystemService, workspaceRoot);
            
            // Open chat panel
            dependencies.chatPanelProvider.createOrShowPanel();
            
            // Create system message with workspace context
            const systemMessage: IOpenRouterMessage = {
                role: 'system',
                content: `You are a codebase navigation assistant. The user is working in a codebase with approximately ${fileCount} files. 
Help them find relevant files or code locations based on their query.
Focus on providing specific file paths, directory structures, or code locations that match their request.
Keep your response concise and directly addressing their navigation needs.`
            };
            
            // Create user message
            const userMessage: IOpenRouterMessage = {
                role: 'user',
                content: promptText
            };
            
            // Create request
            const apiClient = OpenRouterApiClient.getInstance();
            
            let searchResults: SearchResult[] = [];
            
            // First perform a code analysis on the most likely relevant files
            if (codeAnalysisService) {
                searchResults = await codeAnalysisService.findRelevantFiles(promptText, 5);
            }
            
            // Create an enhanced prompt with the code info
            let enhancedContext = `Based on an initial search, here are some potentially relevant files:\n`;
            
            for (const result of searchResults) {
                enhancedContext += `- ${result.relativePath}\n`;
            }
            
            const enhancedMessage: IOpenRouterMessage = {
                role: 'system',
                content: enhancedContext
            };
            
            const request: IOpenRouterCompletionRequest = {
                model: context.configurationService.getModelId(),
                messages: [
                    systemMessage,
                    enhancedMessage,
                    userMessage
                ],
                temperature: context.configurationService.getTemperature(),
                max_tokens: context.configurationService.getMaxTokens()
            };
            
            // Get streamed response to provide better UX
            await new Promise<void>((resolve, reject) => {
                apiClient.createStreamingCompletion(
                    request,
                    (data) => {
                        // Streaming handled by chat panel
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        resolve();
                    }
                );
            });
            
            // Track navigation usage
            context.telemetryService.trackEvent('codebase_navigated', {
                queryLength: promptText.length.toString(),
                fileCount: String(fileCount)
            });
            
            // Show success
            dependencies.statusBarManager.showReady();
        } catch (error) {
            context.loggingService.error('Failed to navigate codebase', error);
            vscode.window.showErrorMessage(`Failed to navigate codebase: ${error instanceof Error ? error.message : String(error)}`);
            dependencies.statusBarManager.showError('Failed');
        }
    });
    
    context.registerDisposable(command);
}

// Helper function to count files in workspace (limited to avoid performance issues)
async function countFiles(fileSystemService: FileSystemService | undefined, workspaceRoot: string): Promise<number> {
    if (!fileSystemService) {
        return 100; // Default estimate
    }
    
    try {
        const MAX_FILES_TO_COUNT = 1000;
        let fileCount = 0;
        
        // Get all ts, js, json, etc. files up to the max count
        const files = await vscode.workspace.findFiles('**/*.{ts,js,json,md,html,css,scss}', '**/node_modules/**', MAX_FILES_TO_COUNT);
        fileCount = files.length;
        
        return fileCount < MAX_FILES_TO_COUNT ? fileCount : MAX_FILES_TO_COUNT;
    } catch (error) {
        return 100; // Default estimate on error
    }
} 