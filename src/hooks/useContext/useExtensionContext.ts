import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export interface UseExtensionContextOptions {
    showErrors?: boolean;
}

export interface UseExtensionContextResult {
    context: ExtensionContext | undefined;
    vscodeContext: vscode.ExtensionContext | undefined;
    configService: ConfigurationService | undefined;
    loggingService: LoggingService | undefined;
    telemetryService: TelemetryService | undefined;
    authService: AuthenticationService | undefined;
    extensionPath: string | undefined;
    globalStoragePath: string | undefined;
    logPath: string | undefined;
    subscriptions: vscode.Disposable[] | undefined;
    isInitialized: boolean;
}

export function useExtensionContext(
    options: UseExtensionContextOptions = { showErrors: true }
): UseExtensionContextResult {
    let context: ExtensionContext | undefined;
    let vscodeContext: vscode.ExtensionContext | undefined;
    let configService: ConfigurationService | undefined;
    let loggingService: LoggingService | undefined;
    let telemetryService: TelemetryService | undefined;
    let authService: AuthenticationService | undefined;
    let extensionPath: string | undefined;
    let globalStoragePath: string | undefined;
    let logPath: string | undefined;
    let subscriptions: vscode.Disposable[] | undefined;
    let isInitialized = false;

    try {
        // Try to get the extension context from global state
        const extension = vscode.extensions.getExtension('m31-ai.m31-agent');
        if (extension?.isActive) {
            context = extension.exports.context;
            
            if (context) {
                vscodeContext = context.vscodeContext;
                configService = context.configurationService;
                loggingService = context.loggingService;
                telemetryService = context.telemetryService;
                authService = context.authenticationService;
                extensionPath = context.extensionPath;
                globalStoragePath = vscodeContext?.globalStoragePath;
                logPath = context.logPath;
                subscriptions = context.subscriptions;
                isInitialized = true;
            }
        }
    } catch (error) {
        if (options.showErrors) {
            console.error('Failed to access extension context', error);
        }
    }

    return {
        context,
        vscodeContext,
        configService,
        loggingService,
        telemetryService,
        authService,
        extensionPath,
        globalStoragePath,
        logPath,
        subscriptions,
        isInitialized
    };
} 