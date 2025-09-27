import { TokenActivityWebSocketServer } from '../websocketServer.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting IgrisAI Token Activity WebSocket Server...');

    // Check for required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Error: OPENROUTER_API_KEY environment variable is required');
      process.exit(1);
    }

    if (!process.env.GRAPH_ACCESS_TOKEN) {
      console.warn('Warning: GRAPH_ACCESS_TOKEN environment variable not set. Some features may not work.');
    }

    // Create and start WebSocket server
    const server = new TokenActivityWebSocketServer(8080);
    await server.start();

    console.log('IgrisAI Token Activity WebSocket Server started successfully');
    console.log('WebSocket endpoint: ws://localhost:8080');
    console.log('Available message types:');
    console.log('- subscribe_token_activity: Subscribe to token activity updates');
    console.log('- unsubscribe_token_activity: Unsubscribe from token activity updates');
    console.log('- get_token_analysis: Get comprehensive token analysis');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down IgrisAI Token Activity WebSocket Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down IgrisAI Token Activity WebSocket Server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start IgrisAI Token Activity WebSocket Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
