import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { 
  createProtocolConnection, 
  StreamMessageReader, 
  StreamMessageWriter,
  InitializeRequest,
  InitializeParams,
  TextDocumentSyncKind,
  WorkspaceSymbolRequest,
  WorkspaceSymbolParams,
  SymbolInformation
} from 'vscode-languageserver-protocol/node';

const lspServer = "jdt-language-server-1.48.0-202505152338"

export class JavaLanguageServerClient {
  private serverProcess: ChildProcess | null = null;
  private connection: any = null;

  async start(workspaceRoot: string): Promise<void> {
    // Detect OS for config
    const platform = process.platform;
    let configDir = 'config_linux';
    if (platform === 'darwin') configDir = 'config_mac';
    if (platform === 'win32') configDir = 'config_win';

    // Server paths - updated to use existing lsp-server/java directory
    const serverPath = path.join(__dirname, '..', 'lsp-server', 'java', lspServer);
    const pluginsPath = path.join(serverPath, 'plugins');
    
    // Find launcher JAR (you may need to adjust this based on your version)
    const fs = require('fs');
    const pluginFiles = fs.readdirSync(pluginsPath);
    const launcherJar = pluginFiles.find((file: string) => 
      file.startsWith('org.eclipse.equinox.launcher_') && file.endsWith('.jar')
    );
    
    if (!launcherJar) {
      throw new Error('Could not find equinox launcher JAR in plugins directory');
    }
    
    const launcherPath = path.join(pluginsPath, launcherJar);

    // Server arguments
    const args = [
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-Dlog.protocol=true',
      '-Dlog.level=ALL',
      '-Xmx1G',
      '--add-modules=ALL-SYSTEM',
      '--add-opens', 'java.base/java.util=ALL-UNNAMED',
      '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
      '-jar', launcherPath,
      '-configuration', path.join(serverPath, configDir),
      '-data', path.join(workspaceRoot, '.metadata'),
    ];

    console.log('Starting Java Language Server...');
    console.log('Command:', 'java', args.join(' '));

    // Start the server process
    this.serverProcess = spawn('java', args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    if (!this.serverProcess.stdin || !this.serverProcess.stdout) {
      throw new Error('Failed to create server process streams');
    }

    // Create the connection
    this.connection = createProtocolConnection(
      new StreamMessageReader(this.serverProcess.stdout),
      new StreamMessageWriter(this.serverProcess.stdin),
      console
    );

    // Listen for connection events
    this.connection.listen();

    // Initialize the server
    await this.initialize(workspaceRoot);
  }

  private async initialize(workspaceRoot: string): Promise<void> {
    // Normalize the path and create proper file URI
    const normalizedPath = path.resolve(workspaceRoot);
    const fileUri = this.pathToUri(normalizedPath);
    
    const initializeParams: InitializeParams = {
      processId: process.pid,
      rootUri: fileUri,
      workspaceFolders: [
        {
          uri: fileUri,
          name: path.basename(normalizedPath)
        }
      ],
      capabilities: {
        workspace: {
          workspaceFolders: true,
          symbol: {
            symbolKind: {
              valueSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
            }
          }
        },
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            didSave: true
          }
        }
      },
      initializationOptions: {
        workspaceFolders: [fileUri],
        settings: {
          java: {
            configuration: {
              updateBuildConfiguration: 'automatic'
            },
            format: {
              enabled: true
            }
          }
        }
      }
    };

    console.log('Initializing server...');
    
    try {
      const result = await this.connection.sendRequest(InitializeRequest.type, initializeParams);
      console.log('Server initialized successfully');
      console.log('Server capabilities:', JSON.stringify(result.capabilities, null, 2));

      // Send initialized notification
      await this.connection.sendNotification('initialized', {});
      
      // Wait a bit for the server to fully start up
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Server ready for requests');
      
    } catch (error) {
      console.error('Failed to initialize server:', error);
      throw error;
    }
  }

  // Helper method to convert file path to proper URI
  private pathToUri(filePath: string): string {
    // Normalize the path
    const normalizedPath = path.resolve(filePath);
    
    // Convert to file URI format
    if (process.platform === 'win32') {
      // Windows: file:///C:/path/to/folder
      return 'file:///' + normalizedPath.replace(/\\/g, '/');
    } else {
      // Unix-like: file:///path/to/folder
      return 'file://' + normalizedPath;
    }
  }

  async searchSymbols(query: string): Promise<SymbolInformation[]> {
    if (!this.connection) {
      throw new Error('Server not started');
    }

    console.log(`Searching for symbols: "${query}"`);
    
    const params: WorkspaceSymbolParams = {
      query: query
    };

    try {
      const result = await this.connection.sendRequest(WorkspaceSymbolRequest.type, params);
      console.log(`Found ${result ? result.length : 0} symbols`);
      return result || [];
    } catch (error) {
      console.error('Symbol search failed:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.sendRequest('shutdown', null);
        await this.connection.sendNotification('exit', null);
      } catch (error) {
        console.warn('Error during graceful shutdown:', error);
      }
      this.connection.dispose();
      this.connection = null;
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

// Main function to demonstrate usage
export async function runJavaSymbolSearch(workspaceRoot: string, searchQuery: string = 'UserService') {
  const client = new JavaLanguageServerClient();
  
  try {
    await client.start(workspaceRoot);
    
    const symbols = await client.searchSymbols(searchQuery);
    
    console.log('\n=== Search Results ===');
    if (symbols.length === 0) {
      console.log('No symbols found');
    } else {
      symbols.forEach((symbol, index) => {
        console.log(`${index + 1}. ${symbol.name}`);
        console.log(`   Kind: ${getSymbolKindName(symbol.kind)}`);
        console.log(`   Location: ${symbol.location.uri}`);
        console.log(`   Range: Line ${symbol.location.range.start.line + 1}, Col ${symbol.location.range.start.character + 1}`);
        if (symbol.containerName) {
          console.log(`   Container: ${symbol.containerName}`);
        }
        console.log('');
      });
    }
    
  } finally {
    await client.stop();
  }
}

// Helper function to convert symbol kind number to readable name
function getSymbolKindName(kind: number): string {
  const kindNames: { [key: number]: string } = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter'
  };
  return kindNames[kind] || `Unknown(${kind})`;
}