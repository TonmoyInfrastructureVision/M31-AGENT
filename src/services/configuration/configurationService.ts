import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export class ConfigurationService implements vscode.Disposable {
    private static instance: ConfigurationService | undefined;
    private readonly configPrefix = 'm31-agent';
    private disposables: vscode.Disposable[] = [];
    private readonly onConfigurationChangedEmitter = new EventEmitter();

    constructor(private context: vscode.ExtensionContext) {
        ConfigurationService.instance = this;
    }

    public static getInstance(): ConfigurationService | undefined {
        return ConfigurationService.instance;
    }

    public async initialize(): Promise<void> {
        // Listen for configuration changes
        const disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.configPrefix)) {
                this.onConfigurationChangedEmitter.emit('changed', e);
            }
        });
        
        this.disposables.push(disposable);
    }

    public onConfigurationChanged(listener: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        this.onConfigurationChangedEmitter.on('changed', listener);
        return {
            dispose: () => {
                this.onConfigurationChangedEmitter.removeListener('changed', listener);
            }
        };
    }

    public getConfiguration<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(this.configPrefix);
        return config.get<T>(key, defaultValue);
    }

    public async update(key: string, value: any, target: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configPrefix);
        await config.update(key, value, target);
    }

    public getModelId(): string {
        return this.getConfiguration<string>('modelId', 'openai/gpt-4o');
    }

    public getMaxTokens(): number {
        return this.getConfiguration<number>('maxTokens', 1024);
    }

    public getTemperature(): number {
        return this.getConfiguration<number>('temperature', 0.7);
    }

    public isTelemetryEnabled(): boolean {
        return this.getConfiguration<boolean>('enableTelemetry', true);
    }

    public isRequireConfirmation(): boolean {
        return this.getConfiguration<boolean>('requireConfirmation', true);
    }

    public getApiEndpoint(): string {
        return this.getConfiguration<string>('apiEndpoint', 'https://openrouter.ai/api/v1');
    }

    public getAutoSaveDelay(): number {
        return this.getConfiguration<number>('autoSaveDelay', 1000);
    }

    public getLogLevel(): string {
        return this.getConfiguration<string>('logLevel', 'info');
    }

    public showWelcomeOnStartup(): boolean {
        return this.getConfiguration<boolean>('showWelcomeOnStartup', true);
    }

    public async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configPrefix);
        const keys = [
            'modelId',
            'maxTokens',
            'temperature',
            'enableTelemetry',
            'requireConfirmation',
            'apiEndpoint',
            'autoSaveDelay',
            'logLevel',
            'showWelcomeOnStartup'
        ];

        for (const key of keys) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Global);
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 