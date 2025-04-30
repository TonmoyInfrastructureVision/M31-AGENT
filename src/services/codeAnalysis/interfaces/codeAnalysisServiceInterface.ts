import * as vscode from 'vscode';
import { Disposable } from 'vscode';
import { CodeContext } from '../../../models/codebase/codeContext';

export interface ICodeAnalysisService extends Disposable {
    analyzeCurrentDocument(): Promise<CodeContext>;
    analyzeWorkspace(): Promise<string[]>;
    getFileContext(uri: vscode.Uri): Promise<CodeContext>;
    findDefinition(symbol: string): Promise<vscode.Location | undefined>;
    getSimilarCode(codeSnippet: string, maxResults?: number): Promise<string[]>;
} 