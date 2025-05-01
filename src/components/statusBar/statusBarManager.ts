import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private context: ExtensionContext;
    private authService: AuthenticationService | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(context: ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.name = 'M31 Agent';
        this.statusBarItem.command = 'm31-agent.showChat';
        this.statusBarItem.tooltip = 'Open M31 Agent Chat';
        this.disposables.push(this.statusBarItem);
    }

    public initialize(): void {
        this.authService = AuthenticationService.getInstance();
        this.updateStatusBar();

        // Listen for authentication changes
        if (this.authService) {
            const authDisposable = this.context.authenticationService.onAuthStatusChanged(() => {
                this.updateStatusBar();
            });
            this.disposables.push(authDisposable);
        }

        // Listen for configuration changes
        const configDisposable = this.context.configurationService.onConfigurationChanged(e => {
            if (e.affectsConfiguration('m31-agent.modelId')) {
                this.updateStatusBar();
            }
        });
        this.disposables.push(configDisposable);

        this.statusBarItem.show();
    }

    private updateStatusBar(): void {
        const hasApiKey = this.authService?.hasApiKey() ?? false;
        const model = this.context.configurationService.getModelId().split('/').pop() || 'unknown';

        if (hasApiKey) {
            this.statusBarItem.text = `$(hubot) M31 Agent (${model})`;
            this.statusBarItem.tooltip = `M31 Agent - Model: ${model} - Click to open chat`;
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = `$(warning) M31 Agent`;
            this.statusBarItem.tooltip = 'M31 Agent - API key not configured. Click to configure.';
            this.statusBarItem.command = 'm31-agent.configureSettings';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }

    public showMessage(message: string, timeout: number = 5000): void {
        const originalText = this.statusBarItem.text;
        const originalTooltip = this.statusBarItem.tooltip;
        const originalCommand = this.statusBarItem.command;

        this.statusBarItem.text = `$(info) ${message}`;
        this.statusBarItem.tooltip = message;
        this.statusBarItem.command = undefined;

        setTimeout(() => {
            this.statusBarItem.text = originalText;
            this.statusBarItem.tooltip = originalTooltip;
            this.statusBarItem.command = originalCommand;
        }, timeout);
    }

    /**
     * Shows a busy indicator in the status bar
     */
    public showBusy(message: string): void {
        this.statusBarItem.text = `$(sync~spin) M31 Agent: ${message}`;
        this.statusBarItem.tooltip = `Working: ${message}...`;
        this.statusBarItem.command = undefined;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    /**
     * Shows a ready state in the status bar
     */
    public showReady(): void {
        this.updateStatusBar();
    }

    /**
     * Shows an error state in the status bar
     */
    public showError(message: string): void {
        this.statusBarItem.text = `$(error) M31 Agent: ${message}`;
        this.statusBarItem.tooltip = `Error: ${message}`;
        this.statusBarItem.command = 'm31-agent.configureSettings';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        // Reset to normal state after a delay
        setTimeout(() => {
            this.updateStatusBar();
        }, 5000);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 