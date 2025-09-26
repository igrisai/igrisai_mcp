import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { OpenRouterClient } from './tools/openRouterClient.js';
import { TokenTransferData, TokenSwapData, MCPToolInfo, AIToolSelection } from './types/index.js';

export class IgrisAIMCPClient {
  private mcpClient: Client;
  private openRouterClient: OpenRouterClient;
  private isConnected: boolean = false;
  private availableTools: MCPToolInfo[] = [];

  constructor() {
    this.mcpClient = new Client({
      name: 'igrisai-mcp-client',
      version: '1.0.0',
    });
    
    this.openRouterClient = new OpenRouterClient();
  }

  async connect(): Promise<void> {
    try {
      // Connect to Graph MCP server
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['@pinax/mcp', '--sse-url', 'https://token-api.mcp.thegraph.com/sse'],
        env: {
          ACCESS_TOKEN: process.env.GRAPH_ACCESS_TOKEN || '',
        },
      });

      await this.mcpClient.connect(transport);
      this.isConnected = true;
      
      console.log('Connected to Graph MCP server successfully');
      
      // Discover available tools
      await this.discoverAvailableTools();
      
    } catch (error) {
      console.error('Failed to connect to Graph MCP server:', error);
      throw error;
    }
  }

  private async discoverAvailableTools(): Promise<void> {
    try {
      const tools = await this.mcpClient.listTools();
      console.log('Available MCP tools:', tools.tools.map(t => t.name));
      
      // Store complete tool information for AI selection
      this.availableTools = tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        inputSchema: {
          type: 'object',
          properties: tool.inputSchema?.properties || {},
          required: tool.inputSchema?.required || []
        },
        examples: [] // Could be populated from tool metadata if available
      }));
    } catch (error) {
      console.error('Failed to discover tools:', error);
      this.availableTools = [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.mcpClient.close();
      this.isConnected = false;
      console.log('Disconnected from Graph MCP server');
    }
  }

  /**
   * Generic tool execution using AI-driven tool selection
   */
  async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      // Call the specified tool with provided parameters
      const result = await this.mcpClient.callTool({
        name: toolName,
        arguments: parameters,
      });

      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw new Error(`Failed to execute tool ${toolName}: ${error}`);
    }
  }



  /**
   * Use AI to analyze user prompt and execute appropriate MCP tool
   */
  async executeUserPrompt(userPrompt: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    if (this.availableTools.length === 0) {
      throw new Error('No MCP tools available');
    }

    try {
      // Use AI to select the best tool for the user's prompt
      const toolSelection: AIToolSelection = await this.openRouterClient.selectToolForPrompt(
        userPrompt, 
        this.availableTools
      );

      console.log(`AI selected tool: ${toolSelection.selectedTool}`);
      console.log(`AI reasoning: ${toolSelection.reasoning}`);
      console.log(`AI parameters:`, toolSelection.parameters);

      // Execute the AI-selected tool using generic method
      const result = await this.executeTool(toolSelection.selectedTool, toolSelection.parameters);

      return {
        toolUsed: toolSelection.selectedTool,
        reasoning: toolSelection.reasoning,
        parameters: toolSelection.parameters,
        result: result
      };
    } catch (error) {
      console.error('Error executing user prompt:', error);
      throw new Error(`Failed to execute user prompt: ${error}`);
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}
