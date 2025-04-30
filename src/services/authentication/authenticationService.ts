import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ConfigurationService } from '../configuration/configurationService';

const AUTH_SECRET_KEY = 'm31-agent.apiKey';

export class AuthenticationService implements vscode.Disposable {
    private static instance: AuthenticationService;
    private apiKey: string | undefined;
    private isInitialized = false;
    private disposables: vscode.Disposable[] = [];
    
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigurationService
    ) {
        AuthenticationService.instance = this;
    }

    public static getInstance(): AuthenticationService {
        return AuthenticationService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            // Try to get the API key from secrets storage
            this.apiKey = await this.context.secrets.get(AUTH_SECRET_KEY);
            
            // If not in secrets, check configuration
            if (!this.apiKey) {
                const configApiKey = this.configService.get<string>('apiKey', '');
                if (configApiKey) {
                    // If found in configuration, move it to secrets
                    await this.setApiKey(configApiKey);
                    // Clear the API key from settings to avoid duplication
                    await this.configService.update('apiKey', '', vscode.ConfigurationTarget.Global);
                }
            }
            
            // Register configuration change listener
            const disposable = this.configService.onDidChangeConfiguration(async (e) => {
                if (e.affectsConfiguration('m31-agent.apiKey')) {
                    const configApiKey = this.configService.get<string>('apiKey', '');
                    if (configApiKey) {
                        await this.setApiKey(configApiKey);
                        // Clear from settings after moving to secrets
                        await this.configService.update('apiKey', '', vscode.ConfigurationTarget.Global);
                    }
                }
            });
            
            this.disposables.push(disposable);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize authentication service:', error);
            throw new Error('Failed to initialize authentication service');
        }
    }

    public async getApiKey(): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Authentication service is not initialized');
        }
        
        // Try to get from cached value
        if (this.apiKey) {
            return this.apiKey;
        }
        
        // Try to get from secrets
        const secretKey = await this.context.secrets.get(AUTH_SECRET_KEY);
        if (secretKey) {
            this.apiKey = secretKey;
            return secretKey;
        }
        
        // If still not found, prompt the user
        const key = await this.promptForApiKey();
        if (key) {
            await this.setApiKey(key);
            return key;
        }
        
        throw new Error('API key is not configured');
    }

    public async setApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store(AUTH_SECRET_KEY, apiKey);
        this.apiKey = apiKey;
    }

    public async clearApiKey(): Promise<void> {
        await this.context.secrets.delete(AUTH_SECRET_KEY);
        this.apiKey = undefined;
    }

    public isAuthenticated(): boolean {
        return this.isInitialized && !!this.apiKey;
    }

    private async promptForApiKey(): Promise<string | undefined> {
        const key = await vscode.window.showInputBox({
            title: 'Enter OpenRouter API Key',
            prompt: 'Please enter your OpenRouter API key',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'sk-or-...'
        });
        
        return key;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 