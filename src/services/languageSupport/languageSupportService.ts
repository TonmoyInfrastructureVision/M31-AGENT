import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';

export interface LanguageDefinition {
    id: string;
    name: string;
    extensions: string[];
    lineCommentToken: string;
    blockCommentStart: string;
    blockCommentEnd: string;
    brackets: [string, string][];
    indentationRules?: {
        increaseIndentationPattern: RegExp;
        decreaseIndentationPattern: RegExp;
    };
}

export class LanguageSupportService implements vscode.Disposable {
    private static instance: LanguageSupportService | undefined;
    private languageDefinitions: Map<string, LanguageDefinition> = new Map();
    private loggingService: LoggingService | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: ExtensionContext) {
        LanguageSupportService.instance = this;
        this.loggingService = context.loggingService;
        this.initializeLanguageDefinitions();
    }

    public static getInstance(): LanguageSupportService | undefined {
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
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            indentationRules: {
                increaseIndentationPattern: /({[^}]*|\([^)]*|\[[^\]]*)$/,
                decreaseIndentationPattern: /^(.*\*\/)?\s*[}\])].*$/
            }
        });

        this.registerLanguage({
            id: 'javascript',
            name: 'JavaScript',
            extensions: ['.js', '.jsx'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            indentationRules: {
                increaseIndentationPattern: /({[^}]*|\([^)]*|\[[^\]]*)$/,
                decreaseIndentationPattern: /^(.*\*\/)?\s*[}\])].*$/
            }
        });

        this.registerLanguage({
            id: 'python',
            name: 'Python',
            extensions: ['.py'],
            lineCommentToken: '#',
            blockCommentStart: '"""',
            blockCommentEnd: '"""',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            indentationRules: {
                increaseIndentationPattern: /^\s*[\{\[\(].*[\}\]\)].*:.*$|^\s*[^#]*:$/,
                decreaseIndentationPattern: /^\s+return|^\s+raise|^\s+pass/
            }
        });

        this.registerLanguage({
            id: 'java',
            name: 'Java',
            extensions: ['.java'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'c',
            name: 'C',
            extensions: ['.c', '.h'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'cpp',
            name: 'C++',
            extensions: ['.cpp', '.hpp', '.cc', '.h'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'csharp',
            name: 'C#',
            extensions: ['.cs'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'go',
            name: 'Go',
            extensions: ['.go'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'ruby',
            name: 'Ruby',
            extensions: ['.rb'],
            lineCommentToken: '#',
            blockCommentStart: '=begin',
            blockCommentEnd: '=end',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'php',
            name: 'PHP',
            extensions: ['.php'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'rust',
            name: 'Rust',
            extensions: ['.rs'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'swift',
            name: 'Swift',
            extensions: ['.swift'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'kotlin',
            name: 'Kotlin',
            extensions: ['.kt', '.kts'],
            lineCommentToken: '//',
            blockCommentStart: '/*',
            blockCommentEnd: '*/',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.registerLanguage({
            id: 'shell',
            name: 'Shell',
            extensions: ['.sh', '.bash'],
            lineCommentToken: '#',
            blockCommentStart: '',
            blockCommentEnd: '',
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        });

        this.loggingService?.debug(`Initialized language support with ${this.languageDefinitions.size} languages`);
    }

    private registerLanguage(definition: LanguageDefinition): void {
        this.languageDefinitions.set(definition.id, definition);
    }

    public getLanguageDefinition(languageId: string): LanguageDefinition | undefined {
        return this.languageDefinitions.get(languageId);
    }

    public getLanguageDefinitionByExtension(extension: string): LanguageDefinition | undefined {
        if (!extension.startsWith('.')) {
            extension = `.${extension}`;
        }
        
        for (const definition of this.languageDefinitions.values()) {
            if (definition.extensions.includes(extension)) {
                return definition;
            }
        }
        
        return undefined;
    }

    public getLanguageDefinitionForDocument(document: vscode.TextDocument): LanguageDefinition | undefined {
        return this.getLanguageDefinition(document.languageId);
    }

    public getSupportedLanguages(): LanguageDefinition[] {
        return Array.from(this.languageDefinitions.values());
    }

    public isCommentLine(line: string, languageId: string): boolean {
        const definition = this.getLanguageDefinition(languageId);
        if (!definition) {
            return false;
        }
        
        const trimmed = line.trim();
        const startsWithLineComment = trimmed.startsWith(definition.lineCommentToken);
        const startsWithBlockComment = definition.blockCommentStart && trimmed.startsWith(definition.blockCommentStart);
        
        return startsWithLineComment || startsWithBlockComment;
    }

    public addLineComment(line: string, languageId: string): string {
        const definition = this.getLanguageDefinition(languageId);
        if (!definition || !definition.lineCommentToken) {
            return line;
        }
        
        return `${definition.lineCommentToken} ${line}`;
    }

    public removeLineComment(line: string, languageId: string): string {
        const definition = this.getLanguageDefinition(languageId);
        if (!definition || !definition.lineCommentToken) {
            return line;
        }
        
        const trimmed = line.trim();
        if (trimmed.startsWith(definition.lineCommentToken)) {
            const commentLength = definition.lineCommentToken.length;
            const leadingSpaces = line.indexOf(definition.lineCommentToken);
            
            // Extract spaces after the comment token
            const contentStart = line.indexOf(definition.lineCommentToken) + commentLength;
            let content = line.substring(contentStart);
            
            // Remove at most one space after the comment token
            if (content.startsWith(' ')) {
                content = content.substring(1);
            }
            
            return ' '.repeat(leadingSpaces) + content;
        }
        
        return line;
    }

    public getFileExtensionForLanguage(languageId: string): string | undefined {
        const definition = this.getLanguageDefinition(languageId);
        if (!definition || definition.extensions.length === 0) {
            return undefined;
        }
        
        // Return the first extension
        return definition.extensions[0];
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}