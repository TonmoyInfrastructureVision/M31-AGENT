import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { ConfigurationService } from '../configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';

export class AuthenticationService implements vscode.Disposable {
    private static instance: AuthenticationService | undefined;
    private readonly API_KEY_SECRET = 'm31-agent.apiKey';
    private apiKey: string | undefined;
    private loggingService: LoggingService | undefined;
    private disposables: vscode.Disposable[] = [];
    private readonly onAuthStatusChangedEmitter = new EventEmitter();

    constructor(
        private context: vscode.ExtensionContext,
        private configService: ConfigurationService
    ) {
        AuthenticationService.instance = this;
    }

    public static getInstance(): AuthenticationService | undefined {
        return AuthenticationService.instance;
    }

    public async initialize(): Promise<void> {
        this.loggingService = LoggingService.getInstance();
        
        try {
            // Try to get the API key from secrets
            this.apiKey = await this.context.secrets.get(this.API_KEY_SECRET);
            
            if (!this.apiKey) {
                this.loggingService?.debug('No API key found in secrets storage');
            } else {
                this.loggingService?.debug('API key found in secrets storage');
            }
        } catch (error) {
            this.loggingService?.error('Failed to initialize authentication service', error);
        }
    }

    public async getApiKey(): Promise<string | undefined> {
        return this.apiKey;
    }

    public async setApiKey(apiKey: string): Promise<void> {
        try {
            if (!apiKey.trim()) {
                throw new Error('API key cannot be empty');
            }

            if (!apiKey.startsWith('sk-')) {
                throw new Error('Invalid API key format. OpenRouter API keys should start with "sk-"');
            }

            // Store API key in secrets storage
            await this.context.secrets.store(this.API_KEY_SECRET, apiKey);
            this.apiKey = apiKey;
            
            this.loggingService?.info('API key saved successfully');
            this.onAuthStatusChangedEmitter.emit('changed');
        } catch (error) {
            this.loggingService?.error('Failed to set API key', error);
            throw error;
        }
    }

    public async clearApiKey(): Promise<void> {
        try {
            await this.context.secrets.delete(this.API_KEY_SECRET);
            this.apiKey = undefined;
            this.loggingService?.info('API key cleared successfully');
            this.onAuthStatusChangedEmitter.emit('changed');
        } catch (error) {
            this.loggingService?.error('Failed to clear API key', error);
            throw error;
        }
    }

    public hasApiKey(): boolean {
        return !!this.apiKey;
    }

    public async validateApiKey(apiKey: string): Promise<boolean> {
        // TODO: Implement validation against the OpenRouter API
        return apiKey.trim().startsWith('sk-');
    }

    public onAuthStatusChanged(listener: () => void): vscode.Disposable {
        this.onAuthStatusChangedEmitter.on('changed', listener);
        return {
            dispose: () => {
                this.onAuthStatusChangedEmitter.removeListener('changed', listener);
            }
        };
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 