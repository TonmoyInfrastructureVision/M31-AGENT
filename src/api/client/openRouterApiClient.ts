import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ExtensionContext } from '../../models/context/extensionContext';
import { IOpenRouterCompletionRequest } from '../interfaces/requests/completionRequest';
import { IOpenRouterCompletionResponse } from '../interfaces/responses/completionResponse';
import { IOpenRouterStreamResponse } from '../interfaces/responses/streamResponse';
import { IOpenRouterError } from '../interfaces/responses/errorResponse';
import { IOpenRouterModelsResponse } from '../interfaces/responses/modelsResponse';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIRequestOptions {
    requestType: AIRequestType;
    messages: AIMessage[];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
}

export interface AIResponse {
    content: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export class OpenRouterApiClient implements vscode.Disposable {
    private static instance: OpenRouterApiClient;
    private client: AxiosInstance;
    private baseUrl = 'https://openrouter.ai/api/v1';
    private apiKey: string = '';
    private disposables: vscode.Disposable[] = [];
    private configService: ConfigurationService;
    private authService: AuthenticationService;
    private loggingService: LoggingService;

    constructor(
        configService: ConfigurationService,
        authService: AuthenticationService,
        loggingService: LoggingService
    ) {
        OpenRouterApiClient.instance = this;
        this.configService = configService;
        this.authService = authService;
        this.loggingService = loggingService;

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'M31-Agent/1.0.0'
            }
        });
    }

    public static getInstance(): OpenRouterApiClient {
        return OpenRouterApiClient.instance;
    }

    public async initialize(): Promise<void> {
        this.loggingService.debug('Initializing OpenRouter API client');
        await this.updateApiKey();

        // Set up API key change listener
        const disposable = this.configService.onConfigurationChanged(async (e) => {
            if (e.affectsConfiguration('m31-agent.apiKey')) {
                await this.updateApiKey();
            }
        });
        this.disposables.push(disposable);
    }

    private async updateApiKey(): Promise<void> {
        try {
            this.apiKey = await this.authService.getApiKey();
            this.loggingService.debug('OpenRouter API key updated');
        } catch (error) {
            this.loggingService.error('Failed to update OpenRouter API key', error);
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
            this.loggingService.debug('Fetching available models from OpenRouter');
            const config: AxiosRequestConfig = {
                headers: this.getAuthHeaders()
            };

            const response = await this.client.get<IOpenRouterModelsResponse>('/models', config);
            this.loggingService.debug(`Retrieved ${response.data.data?.length || 0} models from OpenRouter`);
            
            return response.data;
        } catch (error) {
            this.handleApiError('Failed to fetch models', error);
            throw error;
        }
    }

    public async createCompletion(request: IOpenRouterCompletionRequest): Promise<IOpenRouterCompletionResponse> {
        try {
            this.loggingService.debug('Sending completion request to OpenRouter');
            this.loggingService.trackEvent('api_completion_request', { 
                model: request.model,
                promptTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0).toString()
            });

            const config: AxiosRequestConfig = {
                headers: this.getAuthHeaders()
            };

            const response = await this.client.post<IOpenRouterCompletionResponse>('/chat/completions', request, config);
            
            this.loggingService.debug('Received completion response from OpenRouter');
            this.loggingService.trackEvent('api_completion_response', {
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
            this.loggingService.debug('Sending streaming completion request to OpenRouter');
            this.loggingService.trackEvent('api_streaming_request', { 
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
                        this.loggingService.error('Error parsing streaming response', parseError);
                    }
                }
            });

            stream.on('end', () => {
                this.loggingService.debug('Streaming completion ended');
                this.loggingService.trackEvent('api_streaming_complete', {
                    model: request.model,
                    approximateTokens: totalTokens.toString()
                });
                onComplete();
            });

            stream.on('error', (error: Error) => {
                this.loggingService.error('Streaming completion error', error);
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
        
        this.loggingService.error(`${message}: ${errorCode} - ${errorMessage}`, error);
        
        this.loggingService.trackEvent('api_error', {
            errorCode: errorCode.toString(),
            errorMessage
        });
    }

    public async sendRequest(options: AIRequestOptions): Promise<AIResponse> {
        try {
            const apiKey = await this.authService.getApiKey();
            if (!apiKey) {
                throw new Error('API key not configured. Please set your OpenRouter API key in the extension settings.');
            }

            const modelId = this.configService.getModelId();
            const maxTokens = options.maxTokens || this.configService.getMaxTokens();
            const temperature = options.temperature || this.configService.getTemperature();

            const requestData = {
                model: modelId,
                messages: options.messages,
                max_tokens: maxTokens,
                temperature: temperature,
                stream: options.stream || false
            };

            this.loggingService.debug(`Sending ${options.requestType} request to OpenRouter API`);
            
            const response: AxiosResponse = await this.client.post('/chat/completions', requestData, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const data = response.data;
            
            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response received from the AI service');
            }

            return {
                content: data.choices[0].message.content,
                model: data.model,
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            };
        } catch (error) {
            this.loggingService.error('Error sending request to OpenRouter API', error);
            
            if (axios.isAxiosError(error) && error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data;
                
                if (statusCode === 401 || statusCode === 403) {
                    throw new Error('Authentication failed. Please check your OpenRouter API key.');
                } else if (statusCode === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`API error (${statusCode}): ${JSON.stringify(errorData)}`);
                }
            }
            
            throw error;
        }
    }

    public async streamRequest(
        options: AIRequestOptions,
        onChunk: (chunk: string) => void,
        onComplete: (response: AIResponse) => void,
        onError: (error: Error) => void
    ): Promise<void> {
        try {
            const apiKey = await this.authService.getApiKey();
            if (!apiKey) {
                throw new Error('API key not configured. Please set your OpenRouter API key in the extension settings.');
            }

            const modelId = this.configService.getModelId();
            const maxTokens = options.maxTokens || this.configService.getMaxTokens();
            const temperature = options.temperature || this.configService.getTemperature();

            const requestData = {
                model: modelId,
                messages: options.messages,
                max_tokens: maxTokens,
                temperature: temperature,
                stream: true
            };

            this.loggingService.debug(`Sending streaming ${options.requestType} request to OpenRouter API`);

            const controller = new AbortController();
            const response = await this.client.post('/chat/completions', requestData, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'text/event-stream'
                },
                responseType: 'stream',
                signal: controller.signal
            });

            let fullContent = '';
            let model = '';
            let promptTokens = 0;
            let completionTokens = 0;

            response.data.on('data', (chunk: Buffer) => {
                const data = chunk.toString();
                const lines = data.split('\n').filter(line => line.trim() !== '' && line.startsWith('data: '));

                for (const line of lines) {
                    const eventData = line.substring(6);
                    if (eventData === '[DONE]') {
                        return;
                    }

                    try {
                        const parsed = JSON.parse(eventData);
                        if (parsed.choices && parsed.choices[0]) {
                            const content = parsed.choices[0].delta?.content || '';
                            if (content) {
                                fullContent += content;
                                onChunk(content);
                            }
                            
                            if (parsed.model && !model) {
                                model = parsed.model;
                            }
                            
                            if (parsed.usage) {
                                promptTokens = parsed.usage.prompt_tokens || 0;
                                completionTokens += parsed.choices[0].delta?.content ? 1 : 0;
                            }
                        }
                    } catch (e) {
                        this.loggingService.error('Error parsing streaming response chunk', e);
                    }
                }
            });

            response.data.on('end', () => {
                onComplete({
                    content: fullContent,
                    model: model,
                    promptTokens: promptTokens,
                    completionTokens: completionTokens,
                    totalTokens: promptTokens + completionTokens
                });
            });

            response.data.on('error', (err: Error) => {
                controller.abort();
                onError(err);
            });
        } catch (error) {
            this.loggingService.error('Error in streaming request to OpenRouter API', error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public dispose(): void {
        this.loggingService.debug('Disposing OpenRouter API client');
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 