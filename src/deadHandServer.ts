import { HttpServer } from './httpServer.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting Dead Hand Switch Server...');

    // Check for required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Error: OPENROUTER_API_KEY environment variable is required');
      process.exit(1);
    }

    if (!process.env.GRAPH_ACCESS_TOKEN) {
      console.warn('Warning: GRAPH_ACCESS_TOKEN environment variable not set. Some features may not work.');
    }

    // Create and start HTTP server (includes WebSocket server)
    const server = new HttpServer(3000);
    await server.start();

    console.log('Dead Hand Switch Server started successfully');
    console.log('HTTP endpoint: http://localhost:3000');
    console.log('WebSocket endpoint: ws://localhost:8080');
    console.log('Available endpoints:');
    console.log('- POST /initiate-deadhand: Initiate dead hand check');
    console.log('- GET /health: Health check');
    console.log('- GET /jobs: Get active jobs');
    console.log('- DELETE /jobs/:jobId: Cancel a job');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down Dead Hand Switch Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down Dead Hand Switch Server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Dead Hand Switch Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
