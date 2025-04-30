import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ILanguageDefinition } from '../../models/languageSupport/languageDefinition';

export class LanguageSupportService implements vscode.Disposable {
    private static instance: LanguageSupportService;
    private readonly supportedLanguages: Map<string, ILanguageDefinition> = new Map();
    
    constructor(private readonly context: ExtensionContext) {
        LanguageSupportService.instance = this;
        this.initializeLanguageDefinitions();
    }
    
    public static getInstance(): LanguageSupportService {
        return LanguageSupportService.instance;
    }
    
    private initializeLanguageDefinitions(): void {
        this.registerLanguage({
            id: 'typescript',
            name: 'TypeScript',
            extensions: ['.ts', '.tsx'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.ts',
            indentationSize: 2,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['fs', 'path', 'os', 'crypto', 'http', 'https', 'util', 'events', 'stream', 'querystring', 'url']
        });
        
        this.registerLanguage({
            id: 'javascript',
            name: 'JavaScript',
            extensions: ['.js', '.jsx'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.js',
            indentationSize: 2,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['fs', 'path', 'os', 'crypto', 'http', 'https', 'util', 'events', 'stream', 'querystring', 'url']
        });
        
        this.registerLanguage({
            id: 'python',
            name: 'Python',
            extensions: ['.py'],
            lineCommentToken: '#',
            blockCommentStart: "'''",
            blockCommentEnd: "'''",
            defaultFileExtension: '.py',
            indentationSize: 4,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['os', 'sys', 'datetime', 'math', 'random', 'json', 're', 'collections', 'itertools', 'functools']
        });
        
        this.registerLanguage({
            id: 'java',
            name: 'Java',
            extensions: ['.java'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.java',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['java.util', 'java.io', 'java.math', 'java.time', 'java.text', 'java.nio', 'java.lang']
        });
        
        this.registerLanguage({
            id: 'csharp',
            name: 'C#',
            extensions: ['.cs'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.cs',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['System', 'System.Collections.Generic', 'System.Linq', 'System.Text', 'System.Threading.Tasks']
        });
        
        this.registerLanguage({
            id: 'cpp',
            name: 'C++',
            extensions: ['.cpp', '.cxx', '.cc', '.h', '.hpp'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.cpp',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: false,
            standardModules: ['iostream', 'vector', 'string', 'map', 'algorithm', 'memory', 'ctime', 'cmath', 'fstream']
        });
        
        this.registerLanguage({
            id: 'c',
            name: 'C',
            extensions: ['.c', '.h'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.c',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: false,
            standardModules: ['stdio.h', 'stdlib.h', 'string.h', 'math.h', 'time.h', 'ctype.h', 'stdint.h', 'stdbool.h']
        });
        
        this.registerLanguage({
            id: 'go',
            name: 'Go',
            extensions: ['.go'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.go',
            indentationSize: 4,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['fmt', 'io', 'os', 'strings', 'time', 'strconv', 'math', 'net/http', 'encoding/json']
        });
        
        this.registerLanguage({
            id: 'rust',
            name: 'Rust',
            extensions: ['.rs'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.rs',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['std::io', 'std::fs', 'std::path', 'std::collections', 'std::str', 'std::string', 'std::vec', 'std::env']
        });
        
        this.registerLanguage({
            id: 'swift',
            name: 'Swift',
            extensions: ['.swift'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.swift',
            indentationSize: 4,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['Foundation', 'UIKit', 'SwiftUI', 'Combine']
        });
        
        this.registerLanguage({
            id: 'kotlin',
            name: 'Kotlin',
            extensions: ['.kt', '.kts'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.kt',
            indentationSize: 4,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['kotlin', 'kotlin.collections', 'kotlin.io', 'kotlin.text', 'kotlinx.coroutines']
        });
        
        this.registerLanguage({
            id: 'ruby',
            name: 'Ruby',
            extensions: ['.rb'],
            lineCommentToken: '#',
            blockCommentStart: '=begin',
            blockCommentEnd: '=end',
            defaultFileExtension: '.rb',
            indentationSize: 2,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['json', 'date', 'time', 'fileutils', 'pathname', 'csv', 'net/http', 'uri']
        });
        
        this.registerLanguage({
            id: 'php',
            name: 'PHP',
            extensions: ['.php'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            defaultFileExtension: '.php',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: true,
            standardModules: []
        });
        
        this.registerLanguage({
            id: 'perl',
            name: 'Perl',
            extensions: ['.pl', '.pm'],
            lineCommentToken: '#',
            blockCommentStart: '=pod',
            blockCommentEnd: '=cut',
            defaultFileExtension: '.pl',
            indentationSize: 4,
            usesSemicolons: true,
            usesImports: true,
            standardModules: ['strict', 'warnings', 'Data::Dumper', 'JSON', 'DateTime', 'File::Path']
        });
        
        this.registerLanguage({
            id: 'lua',
            name: 'Lua',
            extensions: ['.lua'],
            lineCommentToken: '--',
            blockCommentStart: '--[[',
            blockCommentEnd: ']]',
            defaultFileExtension: '.lua',
            indentationSize: 2,
            usesSemicolons: false,
            usesImports: false,
            standardModules: ['string', 'table', 'math', 'io', 'os', 'coroutine']
        });
        
        this.registerLanguage({
            id: 'haskell',
            name: 'Haskell',
            extensions: ['.hs'],
            lineCommentToken: '--',
            blockCommentStart: '{-',
            blockCommentEnd: '-}',
            defaultFileExtension: '.hs',
            indentationSize: 2,
            usesSemicolons: false,
            usesImports: true,
            standardModules: ['Data.List', 'Data.Maybe', 'Control.Monad', 'System.IO', 'Data.Map', 'Data.Set']
        });
        
        this.registerLanguage({
            id: 'shell',
            name: 'Bash',
            extensions: ['.sh', '.bash'],
            lineCommentToken: '#',
            blockCommentStart: ': <<\'EOC\'',
            blockCommentEnd: 'EOC',
            defaultFileExtension: '.sh',
            indentationSize: 2,
            usesSemicolons: false,
            usesImports: false,
            standardModules: []
        });
    }
    
    private registerLanguage(definition: ILanguageDefinition): void {
        this.supportedLanguages.set(definition.id, definition);
        
        // Also register with all file extensions
        for (const ext of definition.extensions) {
            const extWithoutDot = ext.startsWith('.') ? ext.substring(1) : ext;
            this.supportedLanguages.set(extWithoutDot, definition);
        }
    }
    
    public getLanguageDefinition(languageIdOrExtension: string): ILanguageDefinition | undefined {
        // Try direct lookup by ID
        if (this.supportedLanguages.has(languageIdOrExtension)) {
            return this.supportedLanguages.get(languageIdOrExtension);
        }
        
        // If it has a leading dot, try without it
        if (languageIdOrExtension.startsWith('.') && this.supportedLanguages.has(languageIdOrExtension.substring(1))) {
            return this.supportedLanguages.get(languageIdOrExtension.substring(1));
        }
        
        // If it doesn't have a leading dot, try with it
        if (!languageIdOrExtension.startsWith('.') && this.supportedLanguages.has(`.${languageIdOrExtension}`)) {
            return this.supportedLanguages.get(`.${languageIdOrExtension}`);
        }
        
        // Try case-insensitive match
        const lowerCaseId = languageIdOrExtension.toLowerCase();
        for (const [id, definition] of this.supportedLanguages.entries()) {
            if (id.toLowerCase() === lowerCaseId) {
                return definition;
            }
            
            if (definition.name.toLowerCase() === lowerCaseId) {
                return definition;
            }
        }
        
        return undefined;
    }
    
    public getLanguageDefinitionForFile(filePath: string): ILanguageDefinition | undefined {
        const extension = filePath.includes('.') ? `.${filePath.split('.').pop()}` : '';
        
        if (!extension) {
            return undefined;
        }
        
        for (const definition of this.supportedLanguages.values()) {
            if (definition.extensions.includes(extension)) {
                return definition;
            }
        }
        
        return undefined;
    }
    
    public getLanguageDefinitionForDocument(document: vscode.TextDocument): ILanguageDefinition | undefined {
        return this.getLanguageDefinition(document.languageId) || 
               this.getLanguageDefinitionForFile(document.fileName);
    }
    
    public getSupportedLanguages(): ILanguageDefinition[] {
        // Return unique language definitions (not the duplicates for extensions)
        const uniqueLanguages = new Map<string, ILanguageDefinition>();
        
        for (const definition of this.supportedLanguages.values()) {
            if (!uniqueLanguages.has(definition.id)) {
                uniqueLanguages.set(definition.id, definition);
            }
        }
        
        return Array.from(uniqueLanguages.values());
    }
    
    public dispose(): void {
        // No resources to dispose
    }
}