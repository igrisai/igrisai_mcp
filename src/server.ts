import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { IgrisAIMCPClient } from './client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting IgrisAI MCP Server...');

    // Create MCP server
    const server = new McpServer({
      name: 'igrisai-mcp-server',
      version: '1.0.0',
    });

    // Create client instance
    const client = new IgrisAIMCPClient();

    // Set up server transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Register tools with the server using the correct API
    const tools = client.getAvailableTools();
    
    for (const tool of tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, async (args, extra) => {
        return await tool.handler(args);
      });
    }

    console.log('IgrisAI MCP Server started successfully');
    console.log('Available tools:', tools.map(t => t.name).join(', '));

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down IgrisAI MCP Server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down IgrisAI MCP Server...');
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start IgrisAI MCP Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
