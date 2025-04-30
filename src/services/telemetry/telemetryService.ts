import * as vscode from 'vscode';
import * as uuid from 'uuid';
import { ConfigurationService } from '../configuration/configurationService';

export class TelemetryService implements vscode.Disposable {
    private static instance: TelemetryService;
    private readonly anonymousId: string;
    private readonly startTime: number;
    private telemetryEnabled: boolean;
    private disposables: vscode.Disposable[] = [];
    
    constructor(private readonly configService: ConfigurationService) {
        TelemetryService.instance = this;
        this.startTime = Date.now();
        this.telemetryEnabled = this.configService.isTelemetryEnabled();
        
        // Generate or retrieve an anonymous ID for tracking
        let telemetryId = this.configService.context.globalState.get<string>('m31AgentTelemetryId');
        if (!telemetryId) {
            telemetryId = uuid.v4();
            this.configService.context.globalState.update('m31AgentTelemetryId', telemetryId);
        }
        this.anonymousId = telemetryId;
        
        // Listen for configuration changes
        const disposable = this.configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('m31-agent.enableTelemetry')) {
                this.telemetryEnabled = this.configService.isTelemetryEnabled();
            }
        });
        
        this.disposables.push(disposable);
    }
    
    public static getInstance(): TelemetryService {
        return TelemetryService.instance;
    }
    
    public trackEvent(eventName: string, properties?: Record<string, string>): void {
        if (!this.telemetryEnabled) {
            return;
        }
        
        const enrichedProperties = {
            ...properties,
            extensionVersion: vscode.extensions.getExtension('m31-ai.m31-agent')?.packageJSON.version || 'unknown',
            vsCodeVersion: vscode.version,
            anonymousId: this.anonymousId,
            timeStamp: new Date().toISOString()
        };
        
        // In a real extension, you'd send this to your telemetry service
        // For this implementation, we'll just log it
        console.log(`TELEMETRY [${eventName}]`, JSON.stringify(enrichedProperties));
    }
    
    public trackError(error: Error, properties?: Record<string, string>): void {
        if (!this.telemetryEnabled) {
            return;
        }
        
        const errorProperties = {
            ...properties,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
        };
        
        this.trackEvent('error', errorProperties);
    }
    
    public trackCommandUsage(commandId: string): void {
        this.trackEvent('command_executed', { commandId });
    }
    
    public trackSessionStart(): void {
        this.trackEvent('session_start');
    }
    
    public trackSessionEnd(): void {
        const sessionDurationMs = Date.now() - this.startTime;
        this.trackEvent('session_end', { 
            durationMs: sessionDurationMs.toString(),
            durationFormatted: this.formatDuration(sessionDurationMs)
        });
    }
    
    public trackAIRequest(
        model: string,
        totalTokens: number,
        promptTokens: number,
        completionTokens: number,
        durationMs: number
    ): void {
        this.trackEvent('ai_request', {
            model,
            totalTokens: totalTokens.toString(),
            promptTokens: promptTokens.toString(),
            completionTokens: completionTokens.toString(),
            durationMs: durationMs.toString(),
            durationFormatted: this.formatDuration(durationMs)
        });
    }
    
    private formatDuration(durationMs: number): string {
        if (durationMs < 1000) {
            return `${durationMs}ms`;
        }
        
        const seconds = Math.floor(durationMs / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    
    public dispose(): void {
        this.trackSessionEnd();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 