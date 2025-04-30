import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../statusBar/statusBarManager';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { v4 as uuidv4 } from 'uuid';
import { AIMessage } from '../../models/ai/aiRequestParams';
import { WebviewMessage } from '../../models/webview/webviewMessage';
import { WebviewMessageType } from '../../models/webview/webviewMessageType';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { IOpenRouterCompletionRequest, IOpenRouterMessage } from '../../api/interfaces/requests/completionRequest';

export class ChatPanelProvider implements vscode.Disposable {
    private static readonly viewType = 'm31Agent.chatPanel';
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private chatHistory: IOpenRouterMessage[] = [];
    
    constructor(private readonly context: ExtensionContext) {}
    
    public createOrShowPanel(): void {
        // If we already have a panel, show it
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        
        // Otherwise, create a new panel
        this.panel = vscode.window.createWebviewPanel(
            ChatPanelProvider.viewType,
            'M31-Agent Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.getExtensionPath(), 'dist', 'webview'))
                ]
            }
        );
        
        // Set initial HTML content
        this.panel.webview.html = this.getWebviewContent();
        
        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            this.handleWebviewMessage,
            this,
            this.disposables
        );
        
        // Reset when the panel is disposed
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                this.disposeWebviewResources();
            },
            null,
            this.disposables
        );
        
        // Start with system message
        this.chatHistory = [
            {
                role: 'system',
                content: 'I am M31-Agent, an AI coding assistant. I can help you with code generation, explanation, and other programming tasks.'
            }
        ];
    }
    
    private handleWebviewMessage = async (message: any): Promise<void> => {
        try {
            switch (message.command) {
                case 'sendMessage':
                    await this.handleUserMessage(message.text);
                    break;
                    
                case 'clearChat':
                    this.clearChat();
                    break;
                    
                case 'executeCode':
                    await this.executeCode(message.code);
                    break;
            }
        } catch (error) {
            this.context.loggingService.error('Error handling webview message', error);
            this.postMessageToWebview({
                command: 'displayError',
                message: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    };
    
    private async handleUserMessage(message: string): Promise<void> {
        if (!message.trim()) {
            return;
        }
        
        // Add user message to chat history
        this.chatHistory.push({ role: 'user', content: message });
        
        // Update UI to show user message
        this.postMessageToWebview({
            command: 'addMessage',
            message: {
                role: 'user',
                content: message
            }
        });
        
        // Show typing indicator
        this.postMessageToWebview({ command: 'showTyping' });
        
        try {
            // Get the API client
            const apiClient = OpenRouterApiClient.getInstance();
            
            // Create request
            const request: IOpenRouterCompletionRequest = {
                model: this.context.configurationService.getModelId(),
                messages: [...this.chatHistory],
                temperature: this.context.configurationService.getTemperature(),
                max_tokens: this.context.configurationService.getMaxTokens()
            };
            
            // Send streamed request
            let responseContent = '';
            
            await new Promise<void>((resolve, reject) => {
                apiClient.createStreamingCompletion(
                    request,
                    (data) => {
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) {
                            responseContent += content;
                            this.postMessageToWebview({
                                command: 'updateStreamContent',
                                content: responseContent
                            });
                        }
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        resolve();
                    }
                );
            });
            
            // Add the full response to chat history
            if (responseContent) {
                this.chatHistory.push({ role: 'assistant', content: responseContent });
                
                // Update UI with final content
                this.postMessageToWebview({
                    command: 'addMessage',
                    message: {
                        role: 'assistant',
                        content: responseContent
                    },
                    final: true
                });
            }
        } catch (error) {
            this.context.loggingService.error('Error sending message to AI', error);
            
            // Show error in chat
            this.postMessageToWebview({
                command: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        } finally {
            // Hide typing indicator
            this.postMessageToWebview({ command: 'hideTyping' });
        }
    }
    
    private clearChat(): void {
        this.chatHistory = [
            {
                role: 'system',
                content: 'I am M31-Agent, an AI coding assistant. I can help you with code generation, explanation, and other programming tasks.'
            }
        ];
        
        this.postMessageToWebview({ command: 'clearChat' });
    }
    
    private async executeCode(code: string): Promise<void> {
        try {
            const terminalService = await import('../../services/terminal/terminalService');
            const terminal = terminalService.TerminalService.getInstance();
            
            await terminal.executeCommand(code);
            
            this.postMessageToWebview({
                command: 'addMessage',
                message: {
                    role: 'system',
                    content: `Executed command: ${code}`
                }
            });
        } catch (error) {
            this.context.loggingService.error('Error executing code', error);
            
            this.postMessageToWebview({
                command: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
    }
    
    private postMessageToWebview(message: any): void {
        if (this.panel && this.panel.webview) {
            this.panel.webview.postMessage(message);
        }
    }
    
    private getWebviewContent(): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>M31-Agent Chat</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 0;
                        margin: 0;
                        color: var(--vscode-foreground);
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                    }
                    .chat-container {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                    }
                    .message {
                        margin-bottom: 16px;
                        display: flex;
                        flex-direction: column;
                    }
                    .message-header {
                        font-weight: bold;
                        margin-bottom: 4px;
                    }
                    .user-message .message-header {
                        color: var(--vscode-textLink-foreground);
                    }
                    .assistant-message .message-header {
                        color: var(--vscode-textPreformat-foreground);
                    }
                    .system-message .message-header {
                        color: var(--vscode-descriptionForeground);
                    }
                    .error-message .message-header {
                        color: var(--vscode-errorForeground);
                    }
                    .message-content {
                        white-space: pre-wrap;
                        padding: 8px 12px;
                        border-radius: 6px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                    }
                    .user-message .message-content {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                    }
                    .error-message .message-content {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        border-color: var(--vscode-inputValidation-errorBorder);
                    }
                    pre {
                        background-color: var(--vscode-textBlockQuote-background);
                        padding: 8px;
                        border-radius: 4px;
                        overflow-x: auto;
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    .input-container {
                        display: flex;
                        padding: 10px;
                        border-top: 1px solid var(--vscode-panel-border);
                        background-color: var(--vscode-editor-background);
                    }
                    #message-input {
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 4px;
                        border: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        resize: none;
                        height: 36px;
                        max-height: 200px;
                        outline: none;
                    }
                    #send-button {
                        margin-left: 8px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 0 12px;
                        border-radius: 4px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                    #send-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .typing-indicator {
                        padding: 12px;
                        display: none;
                    }
                    .typing-indicator span {
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background-color: var(--vscode-descriptionForeground);
                        margin-right: 5px;
                        animation: typing 1s infinite ease-in-out;
                    }
                    .typing-indicator span:nth-child(2) {
                        animation-delay: 0.2s;
                    }
                    .typing-indicator span:nth-child(3) {
                        animation-delay: 0.4s;
                    }
                    @keyframes typing {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }
                    .toolbar {
                        display: flex;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .toolbar button {
                        background-color: transparent;
                        border: 1px solid var(--vscode-button-border);
                        color: var(--vscode-button-foreground);
                        padding: 4px 8px;
                        border-radius: 2px;
                        margin-right: 8px;
                        cursor: pointer;
                    }
                    .toolbar button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button id="clear-button">Clear Chat</button>
                </div>
                <div class="chat-container" id="chat-container"></div>
                <div class="typing-indicator" id="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="input-container">
                    <textarea id="message-input" placeholder="Type your message here..." rows="1"></textarea>
                    <button id="send-button">Send</button>
                </div>
                
                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        const chatContainer = document.getElementById('chat-container');
                        const messageInput = document.getElementById('message-input');
                        const sendButton = document.getElementById('send-button');
                        const clearButton = document.getElementById('clear-button');
                        const typingIndicator = document.getElementById('typing-indicator');
                        
                        // Initialize with a welcome message
                        addMessage({
                            role: 'system',
                            content: 'Welcome to M31-Agent! How can I help you with coding today?'
                        });
                        
                        // Send message when clicking send or pressing Enter
                        sendButton.addEventListener('click', sendMessage);
                        messageInput.addEventListener('keydown', event => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                sendMessage();
                            }
                        });
                        
                        // Auto-resize textarea
                        messageInput.addEventListener('input', () => {
                            messageInput.style.height = 'auto';
                            messageInput.style.height = messageInput.scrollHeight + 'px';
                        });
                        
                        // Clear chat
                        clearButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'clearChat' });
                        });
                        
                        // Handle messages from extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            
                            switch (message.command) {
                                case 'addMessage':
                                    addMessage(message.message);
                                    break;
                                    
                                case 'clearChat':
                                    chatContainer.innerHTML = '';
                                    addMessage({
                                        role: 'system',
                                        content: 'Chat cleared. How can I help you?'
                                    });
                                    break;
                                    
                                case 'showTyping':
                                    typingIndicator.style.display = 'block';
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                    break;
                                    
                                case 'hideTyping':
                                    typingIndicator.style.display = 'none';
                                    break;
                                    
                                case 'updateStreamContent':
                                    updateAssistantMessage(message.content);
                                    break;
                                    
                                case 'displayError':
                                    addMessage({
                                        role: 'error',
                                        content: message.message
                                    });
                                    break;
                            }
                        });
                        
                        function sendMessage() {
                            const text = messageInput.value.trim();
                            if (!text) return;
                            
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text
                            });
                            
                            messageInput.value = '';
                            messageInput.style.height = 'auto';
                            messageInput.focus();
                        }
                        
                        function addMessage(message) {
                            const messageElement = document.createElement('div');
                            messageElement.className = 'message ' + message.role + '-message';
                            
                            const headerElement = document.createElement('div');
                            headerElement.className = 'message-header';
                            
                            switch (message.role) {
                                case 'user':
                                    headerElement.textContent = 'You';
                                    break;
                                case 'assistant':
                                    headerElement.textContent = 'M31-Agent';
                                    break;
                                case 'system':
                                    headerElement.textContent = 'System';
                                    break;
                                case 'error':
                                    headerElement.textContent = 'Error';
                                    break;
                                default:
                                    headerElement.textContent = message.role;
                            }
                            
                            const contentElement = document.createElement('div');
                            contentElement.className = 'message-content';
                            
                            // Process markdown-like formatting
                            let formattedContent = message.content;
                            
                            // Handle code blocks
                            formattedContent = formattedContent.replace(
                                /```([^`]+)```/g,
                                '<pre><code>$1</code></pre>'
                            );
                            
                            // Handle inline code
                            formattedContent = formattedContent.replace(
                                /`([^`]+)`/g,
                                '<code>$1</code>'
                            );
                            
                            contentElement.innerHTML = formattedContent;
                            
                            // Add elements to message
                            messageElement.appendChild(headerElement);
                            messageElement.appendChild(contentElement);
                            
                            // If it's an assistant message, add an ID for streaming updates
                            if (message.role === 'assistant') {
                                contentElement.id = 'assistant-content';
                            }
                            
                            // Add to chat and scroll to bottom
                            chatContainer.appendChild(messageElement);
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                        
                        function updateAssistantMessage(content) {
                            // Get the latest assistant message content element
                            const contentElement = document.getElementById('assistant-content');
                            if (!contentElement) return;
                            
                            // Process markdown-like formatting
                            let formattedContent = content;
                            
                            // Handle code blocks
                            formattedContent = formattedContent.replace(
                                /```([^`]+)```/g,
                                '<pre><code>$1</code></pre>'
                            );
                            
                            // Handle inline code
                            formattedContent = formattedContent.replace(
                                /`([^`]+)`/g,
                                '<code>$1</code>'
                            );
                            
                            contentElement.innerHTML = formattedContent;
                            
                            // Scroll to bottom
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    })();
                </script>
            </body>
            </html>`;
    }
    
    private disposeWebviewResources(): void {
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        this.disposeWebviewResources();
    }
} 