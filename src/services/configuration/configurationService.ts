import * as vscode from 'vscode';
import { IConfigurationService } from './interfaces/configurationServiceInterface';
import { ConfigurationKeys } from '../../config/configurationKeys';
import { ExtensionConfiguration } from '../../models/settings/extensionConfiguration';
import { AIModelConfiguration } from '../../models/settings/aiModelConfiguration';
import { LogLevel } from '../../utils/logging/logLevel';

export class ConfigurationService implements IConfigurationService, vscode.Disposable {
    private static instance: ConfigurationService;
    private readonly configurationPrefix = 'm31-agent';
    private readonly onConfigurationChangedEmitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();
    readonly onConfigurationChanged = this.onConfigurationChangedEmitter.event;
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        ConfigurationService.instance = this;
    }

    public static getInstance(): ConfigurationService {
        return ConfigurationService.instance;
    }

    public async initialize(): Promise<void> {
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.configurationPrefix)) {
                this.onConfigurationChangedEmitter.fire(event);
            }
        });

        this.disposables.push(configChangeListener);
        this.disposables.push(this.onConfigurationChangedEmitter);
    }

    public get<T>(section: string, defaultValue: T): T {
        return vscode.workspace.getConfiguration(this.configurationPrefix).get<T>(section, defaultValue);
    }

    public async update(section: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        await vscode.workspace.getConfiguration(this.configurationPrefix).update(section, value, target);
    }

    public getModelId(): string {
        return this.get<string>('modelId', 'openai/gpt-4o');
    }

    public getMaxTokens(): number {
        return this.get<number>('maxTokens', 4096);
    }

    public getTemperature(): number {
        return this.get<number>('temperature', 0.2);
    }

    public isRequireConfirmation(): boolean {
        return this.get<boolean>('requireConfirmation', true);
    }

    public getLogLevel(): 'debug' | 'info' | 'warning' | 'error' | 'none' {
        return this.get<'debug' | 'info' | 'warning' | 'error' | 'none'>('logLevel', 'info');
    }

    public isTelemetryEnabled(): boolean {
        return this.get<boolean>('enableTelemetry', false);
    }

    public async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configurationPrefix);
        
        await config.update('modelId', undefined, vscode.ConfigurationTarget.Global);
        await config.update('maxTokens', undefined, vscode.ConfigurationTarget.Global);
        await config.update('temperature', undefined, vscode.ConfigurationTarget.Global);
        await config.update('requireConfirmation', undefined, vscode.ConfigurationTarget.Global);
        await config.update('logLevel', undefined, vscode.ConfigurationTarget.Global);
        await config.update('enableTelemetry', undefined, vscode.ConfigurationTarget.Global);
    }

    public getAllSettings(): Record<string, any> {
        const config = vscode.workspace.getConfiguration(this.configurationPrefix);
        
        return {
            modelId: config.get('modelId'),
            maxTokens: config.get('maxTokens'),
            temperature: config.get('temperature'),
            requireConfirmation: config.get('requireConfirmation'),
            logLevel: config.get('logLevel'),
            enableTelemetry: config.get('enableTelemetry'),
        };
    }

    /**
     * Event that is fired when configuration changes that affect this extension occur
     */
    public onDidChangeConfiguration(listener: (e: vscode.ConfigurationChangeEvent) => any): vscode.Disposable {
        return this.onConfigurationChanged(listener);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 