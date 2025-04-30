import * as vscode from 'vscode';
import { Disposable } from 'vscode';

export interface IFileSystemService extends Disposable {
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(filePath: string, content: string, requireConfirmation?: boolean): Promise<void>;
    deleteFile(filePath: string, requireConfirmation?: boolean): Promise<void>;
    exists(path: string): Promise<boolean>;
    isDirectory(path: string): Promise<boolean>;
    listDirectory(dirPath: string): Promise<string[]>;
    findFiles(globPattern: string): Promise<vscode.Uri[]>;
    getCurrentWorkspaceFolder(): Promise<string | undefined>;
} 