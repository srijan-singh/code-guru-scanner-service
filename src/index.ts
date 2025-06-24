// src/index.ts (main demonstration file)
import { JavaLanguageServerClient } from './lsp/java/javaLanguageServerClient';

// Main function to demonstrate usage
export async function runJavaSymbolSearch(workspaceRoot: string, jdtLsPath?: string) {
  let client: JavaLanguageServerClient | null = null;
  
  try {
    client = new JavaLanguageServerClient();
    await client.start(workspaceRoot, jdtLsPath); // Provide workspaceRoot to the start method
    console.log(`Java Language Server Client started for workspace: ${workspaceRoot}`);

    const chunks = await client.extractChunks(workspaceRoot);
    console.log("Extracted Chunks:");
    console.log(JSON.stringify(chunks, null, 2));

  } catch (error) {
    console.error("An error occurred during Java Language Server operation:", error);
  } finally {
    if (client) {
      console.log("Stopping Java Language Server Client...");
      await client.stop();
      console.log("Java Language Server Client stopped.");
    }
  }
}

// Example usage:
// To run this, replace 'path/to/your/java/project' with an actual path.
// For example, if you have a test project in 'test-java-project' relative to your current directory:
const workspacePath = "/Users/srijansingh/Desktop/mcp/user-service";
const jdtLsPath = "/Users/srijansingh/Desktop/mcp/scanner-service/lsp-server/java/jdt-language-server-1.48.0-202505152338";
runJavaSymbolSearch(workspacePath, jdtLsPath);

