import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ExtensionContext } from '../../models/context/extensionContext';
import { IFileSystemService } from './interfaces/fileSystemServiceInterface';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

export class FileSystemService implements IFileSystemService, vscode.Disposable {
    private static instance: FileSystemService | undefined;
    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
        FileSystemService.instance = this;
    }

    public static getInstance(): FileSystemService | undefined {
        return FileSystemService.instance;
    }

    public async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            const content = await readFileAsync(filePath, { encoding });
            return content;
        } catch (error) {
            this.context.loggingService.error(`Failed to read file: ${filePath}`, error);
            throw error;
        }
    }

    public async writeFile(filePath: string, content: string, requireConfirmation: boolean = true): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            
            // Check if the file exists
            const fileExists = await this.fileExists(filePath);
            
            // If confirmation is required and file exists, prompt the user
            if (requireConfirmation && fileExists && this.context.configurationService.isRequireConfirmation()) {
                const overwrite = await vscode.window.showWarningMessage(
                    `File '${path.basename(filePath)}' already exists. Do you want to overwrite it?`,
                    { modal: true },
                    'Overwrite'
                );
                
                if (overwrite !== 'Overwrite') {
                    this.context.loggingService.info(`User cancelled overwriting file ${filePath}`);
                    return;
                }
            }
            
            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(filePath));
            
            // Write the file
            const bytes = Buffer.from(content, 'utf8');
            await vscode.workspace.fs.writeFile(uri, bytes);
            
            this.context.loggingService.info(`File written successfully: ${filePath}`);
            this.context.telemetryService.trackEvent('file_written', { 
                fileExtension: path.extname(filePath),
                fileExists: fileExists.toString()
            });
            
            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            this.context.loggingService.error(`Failed to write file: ${filePath}`, error);
            throw error;
        }
    }

    public async deleteFile(filePath: string, requireConfirmation: boolean = true): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            
            // Check if the file exists
            const fileExists = await this.fileExists(filePath);
            if (!fileExists) {
                this.context.loggingService.warning(`File does not exist, cannot delete: ${filePath}`);
                return;
            }
            
            // If confirmation is required, prompt the user
            if (requireConfirmation && this.context.configurationService.isRequireConfirmation()) {
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete '${path.basename(filePath)}'?`,
                    { modal: true },
                    'Delete'
                );
                
                if (confirm !== 'Delete') {
                    this.context.loggingService.info(`User cancelled file deletion: ${filePath}`);
                    return;
                }
            }
            
            // Delete the file
            await vscode.workspace.fs.delete(uri, { useTrash: true });
            
            this.context.loggingService.info(`File deleted successfully: ${filePath}`);
            this.context.telemetryService.trackEvent('file_deleted', { 
                fileExtension: path.extname(filePath)
            });
        } catch (error) {
            this.context.loggingService.error(`Failed to delete file: ${filePath}`, error);
            throw error;
        }
    }

    public async exists(path: string): Promise<boolean> {
        try {
            return await existsAsync(path);
        } catch (error) {
            this.context.loggingService.error(`Failed to check if path exists: ${path}`, error);
            return false;
        }
    }

    public async isDirectory(path: string): Promise<boolean> {
        try {
            const stats = await statAsync(path);
            return stats.isDirectory();
        } catch (error) {
            this.context.loggingService.error(`Failed to check if path is directory: ${path}`, error);
            return false;
        }
    }

    public async listDirectory(dirPath: string): Promise<string[]> {
        try {
            return await readdirAsync(dirPath);
        } catch (error) {
            this.context.loggingService.error(`Failed to list directory: ${dirPath}`, error);
            throw error;
        }
    }

    public async findFiles(globPattern: string): Promise<vscode.Uri[]> {
        try {
            return await vscode.workspace.findFiles(globPattern);
        } catch (error) {
            this.context.loggingService.error(`Failed to find files with pattern: ${globPattern}`, error);
            throw error;
        }
    }

    public async getCurrentWorkspaceFolder(): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        
        return workspaceFolders[0].uri.fsPath;
    }

    public async fileExists(filePath: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    public async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(dirPath);
            try {
                await vscode.workspace.fs.stat(uri);
                // Directory exists
            } catch {
                // Directory doesn't exist, create it
                await vscode.workspace.fs.createDirectory(uri);
            }
        } catch (error) {
            this.context.loggingService.error(`Failed to ensure directory exists: ${dirPath}`, error);
            throw new Error(`Failed to create directory: ${dirPath}`);
        }
    }

    public getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            return [];
        }
        return folders;
    }

    public getActiveDocumentPath(): string | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }
        return activeEditor.document.uri.fsPath;
    }

    public dispose(): void {
        // No resources to dispose
    }
} 