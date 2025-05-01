import * as vscode from 'vscode';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { ConfigurationService } from '../configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';

export class TelemetryService implements vscode.Disposable {
    private static instance: TelemetryService | undefined;
    private isEnabled: boolean = true;
    private userId: string = '';
    private sessionId: string = '';
    private configService: ConfigurationService;
    private loggingService: LoggingService | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(configService: ConfigurationService) {
        this.configService = configService;
        TelemetryService.instance = this;
        this.sessionId = uuidv4();
        this.initialize();

        // Listen for configuration changes
        const disposable = this.configService.onConfigurationChanged(e => {
            if (e.affectsConfiguration('m31-agent.enableTelemetry')) {
                this.isEnabled = this.configService.isTelemetryEnabled();
                this.loggingService?.info(`Telemetry ${this.isEnabled ? 'enabled' : 'disabled'}`);
            }
        });

        this.disposables.push(disposable);
    }

    public static getInstance(): TelemetryService | undefined {
        return TelemetryService.instance;
    }

    private async initialize(): Promise<void> {
        this.loggingService = LoggingService.getInstance();
        this.isEnabled = this.configService.isTelemetryEnabled();

        // Get user ID from global state or create a new one
        this.userId = await this.getUserId();

        this.loggingService?.debug(`Telemetry initialized, ID: ${this.getUserIdForLogging()}, telemetry enabled: ${this.isEnabled}`);
    }

    private async getUserId(): Promise<string> {
        const context = vscode.extensions.getExtension('m31-agent')?.extensionContext;
        if (!context) {
            return uuidv4();
        }

        const userId = context.globalState.get<string>('m31-agent.userId');
        if (userId) {
            return userId;
        }

        const newUserId = uuidv4();
        await context.globalState.update('m31-agent.userId', newUserId);
        return newUserId;
    }

    private getUserIdForLogging(): string {
        return this.userId ? `${this.userId.substring(0, 8)}...` : 'unknown';
    }

    public trackEvent(
        eventName: string,
        properties?: Record<string, string>,
        measurements?: Record<string, number>
    ): void {
        if (!this.isEnabled) {
            return;
        }

        try {
            // Basic event data
            const eventData = {
                eventName,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                userId: this.userId,
                properties: properties || {},
                measurements: measurements || {},
                // System info (non-identifying)
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    osRelease: os.release(),
                    memoryMB: Math.round(os.totalmem() / (1024 * 1024)),
                    cpuCores: os.cpus().length
                },
                // VS Code info
                vsCode: {
                    version: vscode.version,
                    isRemote: !!vscode.env.remoteName,
                    remoteName: vscode.env.remoteName,
                    uiKind: vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop',
                    language: vscode.env.language
                },
                // Extension info
                extension: {
                    version: vscode.extensions.getExtension('m31-agent')?.packageJSON.version || 'unknown'
                }
            };

            // In real implementation, send to telemetry service
            this.logEvent(eventData);
        } catch (error) {
            this.loggingService?.error('Failed to track telemetry event', error);
        }
    }

    private logEvent(eventData: any): void {
        this.loggingService?.debug(`TELEMETRY: ${eventData.eventName}`, eventData);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 