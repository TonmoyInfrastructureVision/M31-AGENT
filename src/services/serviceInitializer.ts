import { ExtensionContext } from '../models/context/extensionContext';
import { OpenRouterApiClient } from '../api/client/openRouterApiClient';
import { FileSystemService } from './fileSystem/fileSystemService';
import { LanguageSupportService } from './languageSupport/languageSupportService';
import { CodeAnalysisService } from './codeAnalysis/codeAnalysisService';
import { TerminalService } from './terminal/terminalService';

/**
 * Initializes all services in the correct order to handle dependencies
 */
export async function initializeServices(context: ExtensionContext): Promise<void> {
    context.loggingService.info('Initializing services');

    // Initialize core services in the correct order
    try {
        // 1. API Client
        const apiClient = new OpenRouterApiClient(
            context.configurationService,
            context.authenticationService,
            context.loggingService
        );
        await apiClient.initialize();
        context.registerDisposable(apiClient);
        context.loggingService.info('API client initialized');

        // 2. File System Service
        const fileSystemService = new FileSystemService(context);
        context.registerDisposable(fileSystemService);
        context.loggingService.info('File system service initialized');

        // 3. Language Support Service
        const languageSupportService = new LanguageSupportService(context);
        context.registerDisposable(languageSupportService);
        context.loggingService.info('Language support service initialized');

        // 4. Code Analysis Service
        const codeAnalysisService = new CodeAnalysisService(context);
        context.registerDisposable(codeAnalysisService);
        context.loggingService.info('Code analysis service initialized');

        // 5. Terminal Service
        const terminalService = new TerminalService(context);
        context.registerDisposable(terminalService);
        context.loggingService.info('Terminal service initialized');

        context.loggingService.info('All services initialized successfully');
    } catch (error) {
        context.loggingService.error('Failed to initialize services', error);
        throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}