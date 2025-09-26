import { IgrisAIMCPClient } from './client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting IgrisAI MCP Client...');

    // Check for required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Error: OPENROUTER_API_KEY environment variable is required');
      process.exit(1);
    }

    if (!process.env.GRAPH_API_KEY) {
      console.warn('Warning: GRAPH_API_KEY environment variable not set. Some features may not work.');
    }

    // Create and connect client
    const client = new IgrisAIMCPClient();
    await client.connect();

    console.log('IgrisAI MCP Client started successfully');
    console.log('Available tools:', client.getAvailableTools().map(t => t.name).join(', '));

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nShutting down IgrisAI MCP Client...');
      await client.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down IgrisAI MCP Client...');
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start IgrisAI MCP Client:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
