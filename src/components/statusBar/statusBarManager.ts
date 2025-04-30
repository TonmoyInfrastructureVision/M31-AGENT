import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export class StatusBarManager implements vscode.Disposable {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    
    constructor(private readonly context: ExtensionContext) {
        StatusBarManager.instance = this;
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        this.statusBarItem.command = 'm31-agent.showChatPanel';
        this.statusBarItem.tooltip = 'M31-Agent AI Coding Assistant';
        
        this.updateStatusBar(false);
        this.statusBarItem.show();
        
        // Register with extension context
        this.context.registerDisposable(this.statusBarItem);
    }
    
    public static getInstance(): StatusBarManager {
        return StatusBarManager.instance;
    }
    
    public initialize(): void {
        this.context.loggingService.debug('Status bar initialized');
    }
    
    public updateStatusBar(active: boolean): void {
        if (active) {
            this.statusBarItem.text = '$(sparkle) M31-Agent';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = '$(sparkle) M31-Agent';
            this.statusBarItem.backgroundColor = undefined;
        }
    }
    
    public showBusy(message: string = 'Processing'): void {
        this.statusBarItem.text = `$(sync~spin) M31-Agent: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    
    public showReady(): void {
        this.statusBarItem.text = '$(sparkle) M31-Agent';
        this.statusBarItem.backgroundColor = undefined;
    }
    
    public showError(message: string = 'Error'): void {
        this.statusBarItem.text = `$(error) M31-Agent: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        // Reset after a delay
        setTimeout(() => {
            this.showReady();
        }, 3000);
    }
    
    public dispose(): void {
        this.statusBarItem.dispose();
    }
} 