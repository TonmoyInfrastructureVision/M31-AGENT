import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { OpenRouterApiClient, AIMessage } from '../../api/client/openRouterApiClient';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { FileSystemService } from '../../services/fileSystem/fileSystemService';
import { CodeAnalysisService } from '../../services/codeAnalysis/codeAnalysisService';

export class ChatPanelProvider implements vscode.Disposable {
    private static instance: ChatPanelProvider;
    private context: ExtensionContext;
    private panel: vscode.WebviewPanel | undefined;
    private messages: AIMessage[] = [];
    private disposables: vscode.Disposable[] = [];
    private apiClient: OpenRouterApiClient | undefined;
    private fileSystemService: FileSystemService | undefined;
    private codeAnalysisService: CodeAnalysisService | undefined;
    private isProcessing: boolean = false;

    constructor(context: ExtensionContext) {
        this.context = context;
        ChatPanelProvider.instance = this;

        // Get required services
        this.apiClient = OpenRouterApiClient.getInstance();
        this.fileSystemService = FileSystemService.getInstance();
        this.codeAnalysisService = CodeAnalysisService.getInstance();
    }

    public static getInstance(): ChatPanelProvider {
        return ChatPanelProvider.instance;
    }

    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create a new webview panel
        this.panel = vscode.window.createWebviewPanel(
            'm31-agent-chat',
            'M31 Agent Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'dist'))
                ]
            }
        );

        // Set the webview's initial html content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this.handleChatMessage(message.text);
                        break;
                    case 'clearChat':
                        this.clearChat();
                        break;
                    case 'insertCode':
                        this.insertCodeToEditor(message.code);
                        break;
                    case 'copyToClipboard':
                        vscode.env.clipboard.writeText(message.text);
                        this.postMessage({ command: 'notification', text: 'Copied to clipboard' });
                        break;
                }
            },
            undefined,
            this.disposables
        );

        // Reset when the panel is disposed
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            null,
            this.disposables
        );

        // Initialize with system message
        this.initializeChat();
    }

    private initializeChat(): void {
        this.messages = [
            {
                role: 'system',
                content: `You are M31-Agent, an advanced AI coding assistant for VS Code. Your task is to help users with coding tasks, answer programming questions, 
and provide assistance with software development. Be concise yet thorough, and always provide practical, high-quality code examples when appropriate.
Current VS Code version: ${vscode.version}
Current workspace: ${this.getWorkspaceInfo()}`
            }
        ];

        this.postMessage({
            command: 'initialize',
            messages: this.messages.filter(m => m.role !== 'system'),
            isProcessing: this.isProcessing
        });
    }

    private getWorkspaceInfo(): string {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return 'No workspace folder open';
        }
        
        return vscode.workspace.workspaceFolders.map(folder => folder.name).join(', ');
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>M31 Agent Chat</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 0;
                    margin: 0;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                }
                .message {
                    margin-bottom: 16px;
                    display: flex;
                    flex-direction: column;
                }
                .message-content {
                    padding: 8px 12px;
                    border-radius: 8px;
                    max-width: 80%;
                    overflow-wrap: break-word;
                }
                .user-message {
                    align-self: flex-end;
                }
                .user-message .message-content {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .assistant-message {
                    align-self: flex-start;
                }
                .assistant-message .message-content {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                }
                pre {
                    background-color: var(--vscode-textCodeBlock-background);
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
                    padding: 16px;
                    border-top: 1px solid var(--vscode-panel-border);
                }
                #message-input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 4px;
                    resize: none;
                    min-height: 40px;
                    max-height: 200px;
                }
                #send-button {
                    margin-left: 8px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 0 16px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                #send-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .loading {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: var(--vscode-button-foreground);
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .action-buttons {
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                }
                .action-button {
                    background-color: transparent;
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-background);
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .clear-button {
                    background-color: transparent;
                    color: var(--vscode-errorForeground);
                    border: 1px solid var(--vscode-errorForeground);
                    margin-left: auto;
                }
            </style>
        </head>
        <body>
            <div class="chat-container" id="chat-container"></div>
            <div class="input-container">
                <textarea id="message-input" placeholder="Type your message..." rows="1"></textarea>
                <button id="send-button">Send</button>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    let isProcessing = false;
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'initialize':
                                document.getElementById('chat-container').innerHTML = '';
                                message.messages.forEach(msg => addMessage(msg.role, msg.content));
                                isProcessing = message.isProcessing;
                                updateSendButton();
                                break;
                                
                            case 'newMessage':
                                addMessage(message.role, message.content);
                                scrollToBottom();
                                break;
                                
                            case 'updateMessage':
                                updateLastMessage(message.content);
                                scrollToBottom();
                                break;
                                
                            case 'processingStarted':
                                isProcessing = true;
                                updateSendButton();
                                break;
                                
                            case 'processingEnded':
                                isProcessing = false;
                                updateSendButton();
                                scrollToBottom();
                                break;
                                
                            case 'notification':
                                showNotification(message.text);
                                break;
                        }
                    });
                    
                    // Add a message to the chat
                    function addMessage(role, content) {
                        const chatContainer = document.getElementById('chat-container');
                        const messageDiv = document.createElement('div');
                        messageDiv.className = \`message \${role}-message\`;
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        
                        // Process markdown-like content
                        content = processMarkdown(content);
                        contentDiv.innerHTML = content;
                        
                        messageDiv.appendChild(contentDiv);
                        
                        // Add action buttons for assistant messages
                        if (role === 'assistant') {
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.className = 'action-buttons';
                            
                            const copyButton = document.createElement('button');
                            copyButton.className = 'action-button';
                            copyButton.textContent = \`Copy\`;
                            copyButton.onclick = () => {
                                vscode.postMessage({
                                    command: 'copyToClipboard',
                                    text: stripHtml(content)
                                });
                            };
                            
                            buttonsDiv.appendChild(copyButton);
                            
                            // Add buttons to copy or insert code for each code block
                            const codeBlocks = contentDiv.querySelectorAll('pre code');
                            if (codeBlocks.length > 0) {
                                codeBlocks.forEach((codeBlock, index) => {
                                    const code = codeBlock.textContent;
                                    
                                    const insertButton = document.createElement('button');
                                    insertButton.className = 'action-button';
                                    insertButton.textContent = \`Insert Code \${codeBlocks.length > 1 ? (index + 1) : ''}\`;
                                    insertButton.onclick = () => {
                                        vscode.postMessage({
                                            command: 'insertCode',
                                            code: code
                                        });
                                    };
                                    
                                    buttonsDiv.appendChild(insertButton);
                                });
                            }
                            
                            messageDiv.appendChild(buttonsDiv);
                        }
                        
                        chatContainer.appendChild(messageDiv);
                        scrollToBottom();
                    }
                    
                    // Update the content of the last assistant message
                    function updateLastMessage(content) {
                        const messages = document.querySelectorAll('.assistant-message');
                        if (messages.length > 0) {
                            const lastMessage = messages[messages.length - 1];
                            const contentDiv = lastMessage.querySelector('.message-content');
                            
                            // Process markdown-like content
                            content = processMarkdown(content);
                            contentDiv.innerHTML = content;
                        }
                    }
                    
                    // Process markdown-like syntax in messages
                    function processMarkdown(text) {
                        // Handle code blocks
                        text = text.replace(/\`\`\`(\\w*)\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
                        
                        // Handle inline code
                        text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                        
                        // Handle bold text
                        text = text.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
                        
                        // Handle italic text
                        text = text.replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>');
                        
                        // Handle line breaks
                        text = text.replace(/\\n/g, '<br>');
                        
                        return text;
                    }
                    
                    // Strip HTML tags for clipboard
                    function stripHtml(html) {
                        const temp = document.createElement('div');
                        temp.innerHTML = html;
                        return temp.textContent || temp.innerText || '';
                    }
                    
                    // Scroll to the bottom of the chat
                    function scrollToBottom() {
                        const chatContainer = document.getElementById('chat-container');
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                    
                    // Update the send button state
                    function updateSendButton() {
                        const sendButton = document.getElementById('send-button');
                        const messageInput = document.getElementById('message-input');
                        
                        if (isProcessing) {
                            sendButton.innerHTML = '<div class="loading"></div>';
                            sendButton.disabled = true;
                            messageInput.disabled = true;
                        } else {
                            sendButton.innerHTML = 'Send';
                            sendButton.disabled = false;
                            messageInput.disabled = false;
                            messageInput.focus();
                        }
                    }
                    
                    // Show a notification
                    function showNotification(text) {
                        // In a real implementation, this would show a toast notification
                        console.log('Notification:', text);
                    }
                    
                    // Handle the send button click
                    document.getElementById('send-button').addEventListener('click', () => {
                        sendMessage();
                    });
                    
                    // Handle pressing Enter in the input field
                    document.getElementById('message-input').addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    });
                    
                    // Send a message to the extension
                    function sendMessage() {
                        if (isProcessing) return;
                        
                        const messageInput = document.getElementById('message-input');
                        const text = messageInput.value.trim();
                        
                        if (text) {
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text
                            });
                            
                            messageInput.value = '';
                        }
                    }
                    
                    // Auto-resize textarea
                    const messageInput = document.getElementById('message-input');
                    messageInput.addEventListener('input', () => {
                        messageInput.style.height = 'auto';
                        messageInput.style.height = messageInput.scrollHeight + 'px';
                    });
                    
                    // Initialize with an empty chat
                    vscode.postMessage({
                        command: 'ready'
                    });
                })();
            </script>
        </body>
        </html>`;
    }

    private async handleChatMessage(userMessage: string): Promise<void> {
        if (!this.apiClient) {
            vscode.window.showErrorMessage('API client is not initialized');
            return;
        }

        try {
            this.isProcessing = true;
            
            // Add user message to the UI
            this.messages.push({ role: 'user', content: userMessage });
            this.postMessage({
                command: 'newMessage',
                role: 'user',
                content: userMessage
            });
            this.postMessage({ command: 'processingStarted' });

            // Get code context if available
            let contextPrompt = '';
            if (this.codeAnalysisService) {
                try {
                    const codeContext = await this.codeAnalysisService.analyzeCurrentDocument();
                    if (codeContext.hasSelection) {
                        contextPrompt = `\n\nSelected code in ${codeContext.fileName}:\n\`\`\`${codeContext.languageId}\n${codeContext.selectedText}\n\`\`\``;
                    }
                } catch (error) {
                    // Not critical, just proceed without code context
                    this.context.loggingService.warning('Failed to get code context', error);
                }
            }

            // Add context to the user message for the API request
            const messagesWithContext = [...this.messages];
            if (contextPrompt) {
                // Update the last message to include the context
                messagesWithContext[messagesWithContext.length - 1] = {
                    role: 'user',
                    content: userMessage + contextPrompt
                };
            }

            // Stream the response
            let assistantMessage = '';
            
            this.apiClient.streamRequest(
                {
                    requestType: AIRequestType.Chat,
                    messages: messagesWithContext,
                    stream: true
                },
                (chunk) => {
                    // Update UI with each chunk
                    assistantMessage += chunk;
                    this.postMessage({
                        command: 'updateMessage',
                        content: assistantMessage
                    });
                },
                (response) => {
                    // Complete message
                    this.messages.push({ role: 'assistant', content: assistantMessage });
                    this.isProcessing = false;
                    this.postMessage({ command: 'processingEnded' });
                    
                    // Log telemetry
                    this.context.telemetryService.trackEvent('chat_message_completed', {
                        messageLength: userMessage.length.toString(),
                        responseLength: assistantMessage.length.toString()
                    });
                },
                (error) => {
                    // Handle error
                    this.isProcessing = false;
                    this.context.loggingService.error('Error getting AI response', error);
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    this.postMessage({ command: 'processingEnded' });
                }
            );

            // Add empty assistant message that will be updated
            this.postMessage({
                command: 'newMessage',
                role: 'assistant',
                content: ''
            });
        } catch (error) {
            this.isProcessing = false;
            this.context.loggingService.error('Error processing chat message', error);
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
            this.postMessage({ command: 'processingEnded' });
        }
    }

    private postMessage(message: any): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    private clearChat(): void {
        this.initializeChat();
    }

    private insertCodeToEditor(code: string): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found to insert code');
            return;
        }

        editor.edit(editBuilder => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                // Insert at cursor position
                editBuilder.insert(selection.active, code);
            } else {
                // Replace selected text
                editBuilder.replace(selection, code);
            }
        });
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 