import * as vscode from 'vscode';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export class ExtensionContext {
    public readonly subscriptions: vscode.Disposable[] = [];
    private static instance: ExtensionContext | undefined;

    constructor(
        public readonly vscodeContext: vscode.ExtensionContext,
        public readonly configurationService: ConfigurationService,
        public readonly loggingService: LoggingService,
        public readonly telemetryService: TelemetryService,
        public readonly authenticationService: AuthenticationService
    ) {
        ExtensionContext.instance = this;
    }

    public static getInstance(): ExtensionContext | undefined {
        return ExtensionContext.instance;
    }

    public getWorkspaceState<T>(key: string, defaultValue: T): T {
        return this.vscodeContext.workspaceState.get<T>(key, defaultValue);
    }

    public updateWorkspaceState<T>(key: string, value: T): Thenable<void> {
        return this.vscodeContext.workspaceState.update(key, value);
    }

    public getGlobalState<T>(key: string, defaultValue: T): T {
        return this.vscodeContext.globalState.get<T>(key, defaultValue);
    }

    public updateGlobalState<T>(key: string, value: T): Thenable<void> {
        return this.vscodeContext.globalState.update(key, value);
    }

    public getExtensionUri(): vscode.Uri {
        return this.vscodeContext.extensionUri;
    }

    public getStoragePath(): string | undefined {
        return this.vscodeContext.storageUri?.fsPath;
    }

    public getLogUri(): vscode.Uri {
        return this.vscodeContext.logUri;
    }

    public getExtensionPath(): string {
        return this.vscodeContext.extensionPath;
    }

    public registerDisposable(disposable: vscode.Disposable): void {
        this.subscriptions.push(disposable);
    }
} 