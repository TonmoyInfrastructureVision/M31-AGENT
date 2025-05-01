import * as vscode from 'vscode';
import { ConfigurationService } from '../../services/configuration/configurationService';

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    None = 4
}

export class LoggingService implements vscode.Disposable {
    private static instance: LoggingService | undefined;
    private outputChannel: vscode.OutputChannel;
    private configService: ConfigurationService;
    private disposables: vscode.Disposable[] = [];

    constructor(configService: ConfigurationService) {
        this.outputChannel = vscode.window.createOutputChannel('M31-Agent');
        this.configService = configService;
        LoggingService.instance = this;

        // Listen for configuration changes that affect logging
        const disposable = this.configService.onConfigurationChanged(e => {
            if (e.affectsConfiguration('m31-agent.logLevel')) {
                this.info('Log level changed to: ' + this.getLogLevel());
            }
        });

        this.disposables.push(disposable);
    }

    public static getInstance(): LoggingService | undefined {
        return LoggingService.instance;
    }

    private getLogLevel(): LogLevel {
        const configLevel = this.configService.getLogLevel();
        switch (configLevel) {
            case 'debug':
                return LogLevel.Debug;
            case 'info':
                return LogLevel.Info;
            case 'warning':
                return LogLevel.Warning;
            case 'error':
                return LogLevel.Error;
            case 'none':
                return LogLevel.None;
            default:
                return LogLevel.Info;
        }
    }

    public debug(message: string, data?: any): void {
        this.log(LogLevel.Debug, message, data);
    }

    public info(message: string, data?: any): void {
        this.log(LogLevel.Info, message, data);
    }

    public warning(message: string, data?: any): void {
        this.log(LogLevel.Warning, message, data);
    }

    public error(message: string, error?: any): void {
        this.log(LogLevel.Error, message, error);
        
        // Show error notification for critical errors
        vscode.window.showErrorMessage(`M31-Agent Error: ${message}`);
    }

    private log(level: LogLevel, message: string, data?: any): void {
        const currentLevel = this.getLogLevel();
        
        if (level < currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${LogLevel[level]}] ${message}`;
        
        if (data) {
            if (data instanceof Error) {
                logMessage += `\n${data.stack || data.message}`;
            } else if (typeof data === 'object') {
                try {
                    logMessage += `\n${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    logMessage += `\n[Object could not be stringified]`;
                }
            } else {
                logMessage += `\n${data}`;
            }
        }
        
        this.outputChannel.appendLine(logMessage);
        
        // For debug level, also log to console in development mode
        if (level === LogLevel.Debug && process.env.VSCODE_DEBUG_MODE === 'true') {
            console.log(logMessage);
        }
    }

    public showOutputChannel(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 