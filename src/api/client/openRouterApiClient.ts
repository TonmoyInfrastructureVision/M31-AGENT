import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ExtensionContext } from '../../models/context/extensionContext';
import { IOpenRouterCompletionRequest } from '../interfaces/requests/completionRequest';
import { IOpenRouterCompletionResponse } from '../interfaces/responses/completionResponse';
import { IOpenRouterStreamResponse } from '../interfaces/responses/streamResponse';
import { IOpenRouterError } from '../interfaces/responses/errorResponse';
import { IOpenRouterModelsResponse } from '../interfaces/responses/modelsResponse';

export class OpenRouterApiClient implements vscode.Disposable {
    private static instance: OpenRouterApiClient;
    private client: AxiosInstance;
    private baseUrl = 'https://openrouter.ai/api/v1';
    private apiKey: string = '';
    private disposables: vscode.Disposable[] = [];

    constructor(private context: ExtensionContext) {
        OpenRouterApiClient.instance = this;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }

    public static getInstance(): OpenRouterApiClient {
        return OpenRouterApiClient.instance;
    }

    public async initialize(): Promise<void> {
        this.context.loggingService.debug('Initializing OpenRouter API client');
        await this.updateApiKey();

        // Set up API key change listener
        const disposable = this.context.configurationService.onConfigurationChanged(async (e) => {
            if (e.affectsConfiguration('m31-agent.apiKey')) {
                await this.updateApiKey();
            }
        });
        this.disposables.push(disposable);
    }

    private async updateApiKey(): Promise<void> {
        try {
            this.apiKey = await this.context.authenticationService.getApiKey();
            this.context.loggingService.debug('OpenRouter API key updated');
        } catch (error) {
            this.context.loggingService.error('Failed to update OpenRouter API key', error);
            throw new Error('Failed to retrieve OpenRouter API key. Please configure it in settings.');
        }
    }

    private getAuthHeaders(): Record<string, string> {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key is not configured');
        }

        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/m31-ai/m31-agent-vscode',
            'X-Title': 'M31-Agent VS Code Extension'
        };
    }

    public async getModels(): Promise<IOpenRouterModelsResponse> {
        try {
            this.context.loggingService.debug('Fetching available models from OpenRouter');
            const config: AxiosRequestConfig = {
                headers: this.getAuthHeaders()
            };

            const response = await this.client.get<IOpenRouterModelsResponse>('/models', config);
            this.context.loggingService.debug(`Retrieved ${response.data.data?.length || 0} models from OpenRouter`);
            
            return response.data;
        } catch (error) {
            this.handleApiError('Failed to fetch models', error);
            throw error;
        }
    }

    public async createCompletion(request: IOpenRouterCompletionRequest): Promise<IOpenRouterCompletionResponse> {
        try {
            this.context.loggingService.debug('Sending completion request to OpenRouter');
            this.context.telemetryService.trackEvent('api_completion_request', { 
                model: request.model,
                promptTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0).toString()
            });

            const config: AxiosRequestConfig = {
                headers: this.getAuthHeaders()
            };

            const response = await this.client.post<IOpenRouterCompletionResponse>('/chat/completions', request, config);
            
            this.context.loggingService.debug('Received completion response from OpenRouter');
            this.context.telemetryService.trackEvent('api_completion_response', {
                model: request.model,
                completionTokens: response.data.usage?.completion_tokens?.toString() || '0',
                totalTokens: response.data.usage?.total_tokens?.toString() || '0'
            });
            
            return response.data;
        } catch (error) {
            this.handleApiError('Failed to create completion', error);
            throw error;
        }
    }

    public async createStreamingCompletion(
        request: IOpenRouterCompletionRequest,
        onData: (data: IOpenRouterStreamResponse) => void,
        onError: (error: Error) => void,
        onComplete: () => void
    ): Promise<void> {
        try {
            this.context.loggingService.debug('Sending streaming completion request to OpenRouter');
            this.context.telemetryService.trackEvent('api_streaming_request', { 
                model: request.model,
                promptTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0).toString()
            });

            // Ensure streaming is enabled
            const streamingRequest = { ...request, stream: true };

            const config: AxiosRequestConfig = {
                headers: this.getAuthHeaders(),
                responseType: 'stream'
            };

            const response = await this.client.post('/chat/completions', streamingRequest, config);
            const stream = response.data;

            let buffer = '';
            let totalTokens = 0;

            stream.on('data', (chunk: Buffer) => {
                const chunkStr = chunk.toString();
                buffer += chunkStr;

                // Process complete data events
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') {
                        onComplete();
                        return;
                    }

                    try {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.substring(6);
                            const data = JSON.parse(jsonStr) as IOpenRouterStreamResponse;
                            totalTokens += data.choices?.[0]?.delta?.content?.length || 0;
                            onData(data);
                        }
                    } catch (parseError) {
                        this.context.loggingService.error('Error parsing streaming response', parseError);
                    }
                }
            });

            stream.on('end', () => {
                this.context.loggingService.debug('Streaming completion ended');
                this.context.telemetryService.trackEvent('api_streaming_complete', {
                    model: request.model,
                    approximateTokens: totalTokens.toString()
                });
                onComplete();
            });

            stream.on('error', (error: Error) => {
                this.context.loggingService.error('Streaming completion error', error);
                onError(error);
            });
        } catch (error) {
            this.handleApiError('Failed to create streaming completion', error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private handleApiError(message: string, error: any): void {
        const errorResponse = error.response?.data as IOpenRouterError | undefined;
        const errorCode = errorResponse?.error?.code || error.code || 'unknown';
        const errorMessage = errorResponse?.error?.message || error.message || 'Unknown error';
        
        this.context.loggingService.error(`${message}: ${errorCode} - ${errorMessage}`, error);
        
        this.context.telemetryService.trackEvent('api_error', {
            errorCode: errorCode.toString(),
            errorMessage
        });
    }

    public dispose(): void {
        this.context.loggingService.debug('Disposing OpenRouter API client');
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 