import path from 'path';
import { runJavaSymbolSearch } from './java-client';

async function main() {
  // Get workspace path and search query from command line arguments
  const workspaceRoot = process.argv[2] || path.join(__dirname, '..', 'sample-java-project');
  const searchQuery = process.argv[3] || 'UserService';
  
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Search query: ${searchQuery}`);
  console.log('='.repeat(50));
  
  try {
    await runJavaSymbolSearch(workspaceRoot, searchQuery);
    console.log('Analysis completed successfully!');
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main().catch(console.error);