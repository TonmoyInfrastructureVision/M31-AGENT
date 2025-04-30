import { LogLevel } from '../../utils/logging/logLevel';

export interface ExtensionConfiguration {
    apiKey: string;
    modelId: string;
    logLevel: LogLevel;
    enableTelemetry: boolean;
    maxTokens: number;
    temperature: number;
    requireConfirmation: boolean;
} 