import { ExtensionContext } from '../models/context/extensionContext';
import { OpenRouterApiClient } from '../api/client/openRouterApiClient';
import { CodeAnalysisService } from './codeAnalysis/codeAnalysisService';
import { FileSystemService } from './fileSystem/fileSystemService';
import { LanguageSupportService } from './languageSupport/languageSupportService';
import { TerminalService } from './terminal/terminalService';

export async function initializeServices(context: ExtensionContext): Promise<void> {
    const loggingService = context.loggingService;
    loggingService.info('Initializing services...');

    try {
        // Initialize API clients
        const openRouterClient = new OpenRouterApiClient(context);
        await openRouterClient.initialize();

        // Initialize services
        const fileSystemService = new FileSystemService(context);
        const codeAnalysisService = new CodeAnalysisService(context);
        const languageSupportService = new LanguageSupportService(context);
        const terminalService = new TerminalService(context);

        // Initialize state management
        context.registerDisposable(fileSystemService);
        context.registerDisposable(codeAnalysisService);
        context.registerDisposable(languageSupportService);
        context.registerDisposable(terminalService);
        context.registerDisposable(openRouterClient);

        loggingService.info('Services initialized successfully');
    } catch (error) {
        loggingService.error('Failed to initialize services', error);
        throw error;
    }
} 