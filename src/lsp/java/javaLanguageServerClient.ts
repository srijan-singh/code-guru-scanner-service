// src/lsp/java/javaLanguageServerClient.ts

import { ChildProcess, spawn } from 'child_process'; // Changed to ChildProcess
import { join } from 'path';
import { readFileSync } from 'fs';
import { glob } from 'glob'; // Using 'glob' for file discovery
import { LSPMessageParser, serializeLSPMessage, LSPMessage } from '../lspProtocol';
import { ChunkData } from '../../types';
import * as vscode_lsp from 'vscode-languageserver-protocol';

// Extend LSP types as needed, or use them directly from 'vscode-languageserver-protocol'
// For example, if you want full type safety for LSP messages:
type InitializeParams = vscode_lsp.InitializeParams;
type InitializeResult = vscode_lsp.InitializeResult;
type TextDocumentItem = vscode_lsp.TextDocumentItem;
type DocumentSymbolParams = vscode_lsp.DocumentSymbolParams;
type DocumentSymbol = vscode_lsp.DocumentSymbol;
type Location = vscode_lsp.Location;


export class JavaLanguageServerClient {
    private serverProcess: ChildProcess | null = null; // Changed type to ChildProcess
    private messageIdCounter = 0;
    private responsePromises = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
    private messageParser = new LSPMessageParser();

    constructor() { }

    /**
     * Starts the Java Language Server process and initializes the LSP connection.
     * @param workspaceRoot The root directory of the Java project.
     * @param jdtLsPath The path to the directory containing the JDT LS launcher JAR.
     * Defaults to an environment variable JDT_LS_PATH or a common local path.
     */
    public async start(workspaceRoot: string, jdtLsPath?: string): Promise<void> {
        // Determine the JDT LS path. Prioritize argument, then env variable, then common default.
        const effectiveJdtLsPath = jdtLsPath || process.env.JDT_LS_PATH ||
                                   join(__dirname, '../../jdt-language-server/org.eclipse.jdt.ls.product/target/repository');

        const launcherJarPattern = join(effectiveJdtLsPath, 'plugins', 'org.eclipse.equinox.launcher_*.jar');
        const configPath = join(effectiveJdtLsPath, 'config_mac'); // Or config_win/config_linux depending on OS

        let launcherJar: string = await this.validateJdtLs(launcherJarPattern);

        const args = [
            '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005', // Optional: for debugging JDT LS
            '-jar', launcherJar,
            '-configuration', configPath,
            '-data', join(workspaceRoot, '.jdtls_workspace_data') // Dedicated workspace for JDT LS
        ];

        console.log(`Spawning Java Language Server with command: java ${args.join(' ')}`);
        this.serverProcess = spawn('java', args, {
            cwd: workspaceRoot, // Set cwd to workspaceRoot to help JDT LS find project config
            stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr (stderr inherited for direct logging)
        });

        // Add null checks for stdio streams and event listeners
        if (this.serverProcess.stdout) {
            this.serverProcess.stdout.on('data', (data) => {
                this.messageParser.parse(data.toString(), this.handleIncomingMessage.bind(this));
            });
        }

        if (this.serverProcess.stderr) { // stderr could be null if inherited
            this.serverProcess.stderr.on('data', (data) => {
                console.error(`JDT LS STDERR: ${data.toString()}`);
            });
        } else {
            console.warn('JDT LS stderr is null, output will not be captured directly by the client.');
        }

        if (this.serverProcess) {
            this.serverProcess.on('close', (code) => {
                console.log(`Java Language Server process exited with code ${code}`);
                this.serverProcess = null;
            });

            this.serverProcess.on('error', (err) => {
                console.error('Failed to start Java Language Server process:', err);
                throw err; // Re-throw to be caught by the caller
            });
        }


        await this.initializeLSP(workspaceRoot);
    }

    /**
     * Sends an LSP request and waits for its response.
     * @param method The LSP method name.
     * @param params The parameters for the request.
     * @returns A promise that resolves with the server's response result (type T).
     * @throws {Error} If the server process is not running or stdin is unavailable.
     */
    private sendRequest<T = any>(method: string, params: any): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.serverProcess || !this.serverProcess.stdin) {
                return reject(new Error('LSP server process not running or stdin not available.'));
            }

            const id = this.messageIdCounter++;
            this.responsePromises.set(id, { resolve, reject });

            // Use the static helper method from LSPMessage
            const request: LSPMessage = LSPMessage.createRequest(id, method, params);

            try {
                this.serverProcess.stdin.write(serializeLSPMessage(request));
                // console.log(`Sent request: ${method} (ID: ${id})`);
            } catch (err) {
                this.responsePromises.delete(id); // Clean up the promise
                reject(new Error(`Failed to write request to stdin: ${err instanceof Error ? err.message : String(err)}`));
            }
        });
    }

    /**
     * Sends an LSP notification.
     * @param method The LSP method name.
     * @param params The parameters for the notification.
     * @throws {Error} If the server process is not running or stdin is unavailable.
     */
    private sendNotification(method: string, params: any): void {
        if (!this.serverProcess || !this.serverProcess.stdin) {
            // Changed from console.warn to throwing an error or more robust handling
            // depending on desired client behavior. For a critical operation like this,
            // failing silently with just a warn might not be ideal.
            throw new Error('LSP server process not running or stdin not available, cannot send notification.');
        }

        // Use the static helper method from LSPMessage
        const notification: LSPMessage = LSPMessage.createNotification(method, params);

        try {
            this.serverProcess.stdin.write(serializeLSPMessage(notification));
            // console.log(`Sent notification: ${method}`);
        } catch (err) {
            console.error(`Failed to write notification to stdin: ${err instanceof Error ? err.message : String(err)}`);
            // Depending on your error handling strategy, you might rethrow or log more aggressively
        }
    }

    /**
     * Handles incoming messages from the LSP server.
     * @param message The parsed LSP message.
     */
    private handleIncomingMessage(message: LSPMessage): void {
        if (message.id !== undefined && message.id !== null) {
            const promise = this.responsePromises.get(Number(message.id));
            if (promise) {
                if (message.error) {
                    promise.reject(message.error);
                } else {
                    promise.resolve(message.result);
                }
                this.responsePromises.delete(Number(message.id));
            } else {
                console.warn(`Received response for unknown ID: ${message.id}`);
            }
        } else if (message.method) {
            // console.log(`Received notification: ${message.method}`, message.params);
            switch (message.method) {
                case 'initialized':
                    // Server is initialized, ready for capabilities
                    // This notification is typically sent by the server after it received the initialize request.
                    break;
                case 'window/logMessage':
                case 'telemetry/event':
                    // Ignore common noisy messages
                    break;
                default:
                    // console.log(`Unhandled LSP notification: ${message.method}`, message.params);
                    break;
            }
        }
    }

    /**
     * Performs the LSP initialization handshake.
     * @param workspaceRoot The root URI of the workspace.
     */
    private async initializeLSP(workspaceRoot: string): Promise<void> {
        const initializeParams: InitializeParams = {
            processId: process.pid,
            clientInfo: {
                name: 'Java LSP Client',
                version: '1.0.0'
            },
            rootUri: `file://${workspaceRoot}`,
            capabilities: {
                workspace: {
                    applyEdit: true,
                    workspaceFolders: true,
                    configuration: true
                },
                textDocument: {
                    declaration: { dynamicRegistration: true, linkSupport: true },
                    definition: { dynamicRegistration: true, linkSupport: true },
                    references: { dynamicRegistration: true },
                    documentSymbol: {
                        dynamicRegistration: true,
                        hierarchicalDocumentSymbolSupport: true,
                        symbolKind: {
                            valueSet: [
                                vscode_lsp.SymbolKind.File,
                                vscode_lsp.SymbolKind.Module,
                                vscode_lsp.SymbolKind.Namespace,
                                vscode_lsp.SymbolKind.Package,
                                vscode_lsp.SymbolKind.Class,
                                vscode_lsp.SymbolKind.Method,
                                vscode_lsp.SymbolKind.Property,
                                vscode_lsp.SymbolKind.Field,
                                vscode_lsp.SymbolKind.Constructor,
                                vscode_lsp.SymbolKind.Enum,
                                vscode_lsp.SymbolKind.Interface,
                                vscode_lsp.SymbolKind.Function,
                                vscode_lsp.SymbolKind.Variable,
                                vscode_lsp.SymbolKind.Constant,
                                vscode_lsp.SymbolKind.String,
                                vscode_lsp.SymbolKind.Number,
                                vscode_lsp.SymbolKind.Boolean,
                                vscode_lsp.SymbolKind.Array,
                                vscode_lsp.SymbolKind.Object,
                                vscode_lsp.SymbolKind.Key,
                                vscode_lsp.SymbolKind.Null,
                                vscode_lsp.SymbolKind.EnumMember,
                                vscode_lsp.SymbolKind.Struct,
                                vscode_lsp.SymbolKind.Event,
                                vscode_lsp.SymbolKind.Operator,
                                vscode_lsp.SymbolKind.TypeParameter,
                            ],
                        },
                    },
                    synchronization: {
                        didSave: true,
                        willSave: true,
                        willSaveWaitUntil: true,
                        dynamicRegistration: true,
                    },
                    completion: {
                        completionItem: {
                            labelDetailsSupport: true,
                        },
                    }
                    // Add more capabilities as needed based on what JDT LS supports
                },
            },
            trace: 'off',
            workspaceFolders: [{ uri: `file://${workspaceRoot}`, name: 'Java Project' }],
        };

        const result: InitializeResult = await this.sendRequest('initialize', initializeParams);
        console.log('LSP Initialization Result:', result.capabilities);

        // After receiving initialize response, send initialized notification
        this.sendNotification('initialized', {});
    }

    /**
     * Stops the Java Language Server process.
     */
    public async stop(): Promise<void> {
        if (this.serverProcess) {
            await this.sendRequest('shutdown', {});
            this.sendNotification('exit', {}); // Send exit after shutdown
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    /**
     * Validate JldtLS
     */
    private async validateJdtLs(launcherJarPattern: string): Promise<string> {
        try {
            const jars = await glob(launcherJarPattern);
            if (jars.length === 0) {
                throw new Error(`No JDT LS launcher JAR found at ${launcherJarPattern}. Please ensure JDT LS is installed and JDT_LS_PATH is set correctly.`);
            }
            console.log(`Using JDT LS launcher JAR: ${jars[0]}`);
            return jars[0];
        } catch (error) {
            console.error('Error finding JDT LS launcher JAR:', error);
            throw error;
        }
    }

    /**
     * Extracts ChunkData for all methods in the given workspace.
     * @param workspaceRoot The root directory of the Java project.
     * @returns A promise that resolves with an array of ChunkData.
     */
    public async extractChunks(workspaceRoot: string): Promise<ChunkData[]> {
        const javaFiles = await glob(join(workspaceRoot, '**/*.java'));
        const allChunks: ChunkData[] = [];

        // Store all method symbols with their URIs and ranges for later cross-referencing
        const allMethodSymbols: { uri: string; methodSymbol: DocumentSymbol; className: string; methodCode: string; }[] = [];
        const fileContentMap = new Map<string, string>(); // Map to store content by URI

        console.log(`Found ${javaFiles.length} Java files. Processing...`);

        // First pass: Open documents and get document symbols
        for (const filePath of javaFiles) {
            const fileUri = `file://${filePath}`;
            let fileContent = '';
            try {
                fileContent = readFileSync(filePath, 'utf8');
                fileContentMap.set(fileUri, fileContent);
            } catch (error) {
                console.error(`Error reading file ${filePath}:`, error);
                continue;
            }

            // DidOpen notification
            const textDocument: TextDocumentItem = {
                uri: fileUri,
                languageId: 'java',
                version: 1,
                text: fileContent,
            };
            this.sendNotification('textDocument/didOpen', { textDocument });

            // Request document symbols
            const params: DocumentSymbolParams = {
                textDocument: { uri: fileUri },
            };
            try {
                const symbols: DocumentSymbol[] = await this.sendRequest<DocumentSymbol[]>('textDocument/documentSymbol', params);
                const lines = fileContent.split('\n');

                const processSymbols = (currentSymbols: DocumentSymbol[], currentClassName: string | null) => {
                    for (const symbol of currentSymbols) {
                        const newClassName = (symbol.kind === vscode_lsp.SymbolKind.Class || symbol.kind === vscode_lsp.SymbolKind.Interface || symbol.kind === vscode_lsp.SymbolKind.Enum)
                            ? symbol.name
                            : currentClassName;

                        if (symbol.kind === vscode_lsp.SymbolKind.Method) {
                            if (!newClassName) {
                                console.warn(`Method "${symbol.name}" found without a clear class name in ${fileUri}. Skipping.`);
                                continue;
                            }

                            // Extract method code
                            const methodLines = lines.slice(symbol.range.start.line, symbol.range.end.line + 1);
                            const methodCode = methodLines.join('\n');

                            // Parse return type and parameters from detail string (e.g., "(String arg1) : void")
                            let returnType = 'void'; // Default
                            let parameters: string[] = [];
                            if (symbol.detail) {
                                const parts = symbol.detail.split(' : ');
                                if (parts.length === 2) {
                                    returnType = parts[1].trim();
                                    const paramsString = parts[0].replace(/^\(|\)$/g, ''); // Remove leading/trailing parens
                                    if (paramsString) {
                                        parameters = paramsString.split(',').map(p => p.trim());
                                    }
                                } else if (parts.length === 1 && parts[0].startsWith('(') && parts[0].endsWith(')')) {
                                    // Case for constructors or methods without explicit return type in detail but with params
                                    const paramsString = parts[0].replace(/^\(|\)$/g, '');
                                    if (paramsString) {
                                        parameters = paramsString.split(',').map(p => p.trim());
                                    }
                                }
                            }

                            allMethodSymbols.push({
                                uri: fileUri,
                                methodSymbol: symbol,
                                className: newClassName,
                                methodCode: methodCode
                            });

                            allChunks.push({
                                className: newClassName,
                                methodName: symbol.name,
                                returnType: returnType,
                                parameters: parameters,
                                calledBy: [], // To be populated in second pass
                                dependencies: [], // Hard to determine accurately via standard LSP
                                methodCode: methodCode,
                            });
                        }

                        if (symbol.children && symbol.children.length > 0) {
                            processSymbols(symbol.children, newClassName);
                        }
                    }
                };

                processSymbols(symbols, null);

            } catch (error) {
                console.error(`Error getting document symbols for ${fileUri}:`, error);
            }
        }

        console.log(`Extracted initial ${allMethodSymbols.length} method symbols. Starting second pass for references...`);

        // Second pass: Determine 'calledBy' for each method
        // This is expensive as it makes an LSP call for each method.
        for (const targetMethod of allMethodSymbols) {
            const targetUri = targetMethod.uri;
            const targetPosition = targetMethod.methodSymbol.selectionRange.start; // Position of the method name

            try {
                const references: Location[] = await this.sendRequest<Location[]>('textDocument/references', {
                    textDocument: { uri: targetUri },
                    position: targetPosition,
                    context: { includeDeclaration: false } // Only find usages, not the declaration itself
                });

                const calledByMethods = new Set<string>(); // Use a Set to avoid duplicates

                for (const ref of references) {
                    if (ref.uri === targetUri &&
                        ref.range.start.line === targetMethod.methodSymbol.selectionRange.start.line &&
                        ref.range.start.character === targetMethod.methodSymbol.selectionRange.start.character) {
                        // This reference is the declaration itself, skip if we're explicitly excluding it
                        continue;
                    }

                    // Find which method contains this reference
                    for (const callerMethodCandidate of allMethodSymbols) {
                        if (callerMethodCandidate.uri === ref.uri &&
                            ref.range.start.line >= callerMethodCandidate.methodSymbol.range.start.line &&
                            ref.range.end.line <= callerMethodCandidate.methodSymbol.range.end.line &&
                            callerMethodCandidate.methodSymbol.kind === vscode_lsp.SymbolKind.Method &&
                            !(targetMethod.className === callerMethodCandidate.className && targetMethod.methodSymbol.name === callerMethodCandidate.methodSymbol.name) // Don't count self-calls from same method
                            ) {
                            calledByMethods.add(`${callerMethodCandidate.className}::${callerMethodCandidate.methodSymbol.name}`);
                            break; // Found the calling method, move to next reference
                        }
                    }
                }
                const foundChunk = allChunks.find(c =>
                    c.className === targetMethod.className &&
                    c.methodName === targetMethod.methodSymbol.name &&
                    c.methodCode === targetMethod.methodCode // Use methodCode as a unique identifier if name/class aren't enough
                );
                if (foundChunk) {
                    foundChunk.calledBy = Array.from(calledByMethods);
                }

            } catch (error) {
                console.warn(`Error getting references for ${targetMethod.className}::${targetMethod.methodSymbol.name}:`, error);
            }
        }

        return allChunks;
    }
}
