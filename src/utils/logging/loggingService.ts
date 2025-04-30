import * as vscode from 'vscode';
import { LogLevel } from './logLevel';
import { ConfigurationService } from '../../services/configuration/configurationService';

export class LoggingService implements vscode.Disposable {
    private static instance: LoggingService;
    private outputChannel: vscode.OutputChannel;
    private disposables: vscode.Disposable[] = [];
    private currentLogLevel: LogLevel = LogLevel.Info;

    constructor(private configService: ConfigurationService) {
        LoggingService.instance = this;
        this.outputChannel = vscode.window.createOutputChannel('M31-Agent', 'log');
        this.updateLogLevel();
        
        this.disposables.push(
            this.configService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('m31-agent.logLevel')) {
                    this.updateLogLevel();
                }
            })
        );
    }

    public static getInstance(): LoggingService {
        return LoggingService.instance;
    }

    private updateLogLevel(): void {
        const logLevelStr = this.configService.getLogLevel();
        switch (logLevelStr) {
            case 'debug':
                this.currentLogLevel = LogLevel.Debug;
                break;
            case 'info':
                this.currentLogLevel = LogLevel.Info;
                break;
            case 'warning':
                this.currentLogLevel = LogLevel.Warning;
                break;
            case 'error':
                this.currentLogLevel = LogLevel.Error;
                break;
            case 'none':
                this.currentLogLevel = LogLevel.None;
                break;
            default:
                this.currentLogLevel = LogLevel.Info;
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
        
        // For errors, also show a notification if it's an actual error object
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${message}: ${error.message}`);
        }
    }

    private log(level: LogLevel, message: string, data?: any): void {
        if (level > this.currentLogLevel || this.currentLogLevel === LogLevel.None) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level].toUpperCase();
        
        let logMessage = `[${timestamp}] [${levelStr}] ${message}`;
        
        if (data !== undefined) {
            if (data instanceof Error) {
                logMessage += `\n${data.stack || data.message}`;
            } else if (typeof data === 'object') {
                try {
                    logMessage += `\n${JSON.stringify(data, null, 2)}`;
                } catch (err) {
                    logMessage += `\n[Object could not be stringified]`;
                }
            } else {
                logMessage += `\n${data}`;
            }
        }
        
        this.outputChannel.appendLine(logMessage);
        
        // Show the output channel for errors (optional)
        if (level === LogLevel.Error) {
            this.outputChannel.show(true);
        }
    }

    public dispose(): void {
        this.outputChannel.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 