import * as vscode from 'vscode';
import * as path from 'path';
import { useLogging } from '../useLogging';

export interface FileInfo {
    uri: vscode.Uri;
    fsPath: string;
    fileName: string;
    extension: string;
    languageId: string;
    workspaceFolder: string | undefined;
    isUntitled: boolean;
    isDirty: boolean;
}

export interface EditorInfo {
    document: vscode.TextDocument | undefined;
    selection: vscode.Selection | undefined;
    selectedText: string;
    cursorPosition: vscode.Position | undefined;
    lineCount: number;
    fileInfo: FileInfo | undefined;
    visibleRanges: readonly vscode.Range[];
}

export interface UseActiveEditorResult {
    editorInfo: EditorInfo;
    isActive: boolean;
    insertText: (text: string, position?: vscode.Position) => Promise<boolean>;
    replaceText: (text: string, range?: vscode.Range) => Promise<boolean>;
    getWordAtPosition: (position?: vscode.Position) => string | undefined;
    getActiveEditor: () => vscode.TextEditor | undefined;
    refresh: () => EditorInfo;
}

export function useActiveEditor(): UseActiveEditorResult {
    const logging = useLogging();
    const emptyEditorInfo: EditorInfo = {
        document: undefined,
        selection: undefined,
        selectedText: '',
        cursorPosition: undefined,
        lineCount: 0,
        fileInfo: undefined,
        visibleRanges: []
    };

    function getActiveEditor(): vscode.TextEditor | undefined {
        return vscode.window.activeTextEditor;
    }

    function getFileInfo(document: vscode.TextDocument): FileInfo | undefined {
        if (!document) {
            return undefined;
        }

        const uri = document.uri;
        const fsPath = uri.fsPath;
        const fileName = path.basename(fsPath);
        const extension = path.extname(fsPath).slice(1);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;

        return {
            uri,
            fsPath,
            fileName,
            extension,
            languageId: document.languageId,
            workspaceFolder,
            isUntitled: document.isUntitled,
            isDirty: document.isDirty
        };
    }

    function getCurrentEditorInfo(): EditorInfo {
        const editor = getActiveEditor();
        
        if (!editor) {
            return emptyEditorInfo;
        }

        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);
        const cursorPosition = selection.active;
        const lineCount = document.lineCount;
        const fileInfo = getFileInfo(document);
        const visibleRanges = editor.visibleRanges;

        return {
            document,
            selection,
            selectedText,
            cursorPosition,
            lineCount,
            fileInfo,
            visibleRanges
        };
    }

    async function insertText(text: string, position?: vscode.Position): Promise<boolean> {
        const editor = getActiveEditor();
        if (!editor) {
            logging.warning('No active editor to insert text into');
            return false;
        }

        try {
            const insertPosition = position || editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, text);
            });
            return true;
        } catch (error) {
            logging.error('Failed to insert text into editor', error);
            return false;
        }
    }

    async function replaceText(text: string, range?: vscode.Range): Promise<boolean> {
        const editor = getActiveEditor();
        if (!editor) {
            logging.warning('No active editor to replace text in');
            return false;
        }

        try {
            const replaceRange = range || editor.selection;
            await editor.edit(editBuilder => {
                editBuilder.replace(replaceRange, text);
            });
            return true;
        } catch (error) {
            logging.error('Failed to replace text in editor', error);
            return false;
        }
    }

    function getWordAtPosition(position?: vscode.Position): string | undefined {
        const editor = getActiveEditor();
        if (!editor || !editor.document) {
            return undefined;
        }

        const document = editor.document;
        const pos = position || editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(pos);
        
        if (wordRange) {
            return document.getText(wordRange);
        }
        
        return undefined;
    }

    const editorInfo = getCurrentEditorInfo();
    const isActive = !!getActiveEditor();

    return {
        editorInfo,
        isActive,
        insertText,
        replaceText,
        getWordAtPosition,
        getActiveEditor,
        refresh: getCurrentEditorInfo
    };
} 