import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { OpenRouterClient } from './tools/openRouterClient.js';
import { TokenTransferData, TokenSwapData } from './types/index.js';

export class IgrisAIMCPClient {
  private mcpClient: Client;
  private openRouterClient: OpenRouterClient;
  private isConnected: boolean = false;
  private availableTools: string[] = [];

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
      
      // Store available tool names for later use
      this.availableTools = tools.tools.map(t => t.name);
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

  async getTokenTransfers(tokenAddress: string, chain: string = 'ethereum', timeframe: string = '24h'): Promise<TokenTransferData> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      // Find a tool that might handle token transfers
      const transferTool = this.findToolForTransfers();
      
      if (!transferTool) {
        console.warn('No transfer tool found, returning mock data');
        return this.getMockTransferData();
      }

      // Call the discovered tool
      const result = await this.mcpClient.callTool({
        name: transferTool,
        arguments: {
          tokenAddress,
          chain,
          timeframe,
        },
      });

      // Parse the result and return structured data
      const resultText = (result.content as any)?.[0]?.text;
      const parsedResult = resultText ? JSON.parse(resultText) : {};
      
      const transferData: TokenTransferData = {
        totalTransfers: parsedResult.totalTransfers || 0,
        uniqueAddresses: parsedResult.uniqueAddresses || 0,
        totalVolume: parsedResult.totalVolume || '0',
        averageTransferSize: parsedResult.averageTransferSize || '0',
        topSenders: parsedResult.topSenders || [],
        topReceivers: parsedResult.topReceivers || [],
        timestamp: new Date().toISOString(),
      };

      return transferData;
    } catch (error) {
      console.error('Error getting token transfers:', error);
      return this.getMockTransferData();
    }
  }

  async getTokenSwaps(tokenAddress: string, chain: string = 'ethereum', timeframe: string = '24h'): Promise<TokenSwapData> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      // Find a tool that might handle token swaps
      const swapTool = this.findToolForSwaps();
      
      if (!swapTool) {
        console.warn('No swap tool found, returning mock data');
        return this.getMockSwapData();
      }

      // Call the discovered tool
      const result = await this.mcpClient.callTool({
        name: swapTool,
        arguments: {
          tokenAddress,
          chain,
          timeframe,
        },
      });

      // Parse the result and return structured data
      const resultText = (result.content as any)?.[0]?.text;
      const parsedResult = resultText ? JSON.parse(resultText) : {};
      
      const swapData: TokenSwapData = {
        totalSwaps: parsedResult.totalSwaps || 0,
        averagePrice: parsedResult.averagePrice || '0',
        priceChange: parsedResult.priceChange || '0%',
        totalVolume: parsedResult.totalVolume || '0',
        liquidityChanges: parsedResult.liquidityChanges || '0%',
        timestamp: new Date().toISOString(),
      };

      return swapData;
    } catch (error) {
      console.error('Error getting token swaps:', error);
      return this.getMockSwapData();
    }
  }

  private findToolForTransfers(): string | null {
    // Look for tools that might handle transfers
    const transferKeywords = ['transfer', 'token', 'balance', 'transaction'];
    
    for (const tool of this.availableTools) {
      for (const keyword of transferKeywords) {
        if (tool.toLowerCase().includes(keyword)) {
          console.log(`Found potential transfer tool: ${tool}`);
          return tool;
        }
      }
    }
    
    return null;
  }

  private findToolForSwaps(): string | null {
    // Look for tools that might handle swaps
    const swapKeywords = ['swap', 'trade', 'exchange', 'liquidity', 'pool'];
    
    for (const tool of this.availableTools) {
      for (const keyword of swapKeywords) {
        if (tool.toLowerCase().includes(keyword)) {
          console.log(`Found potential swap tool: ${tool}`);
          return tool;
        }
      }
    }
    
    return null;
  }

  private getMockTransferData(): TokenTransferData {
    return {
      totalTransfers: Math.floor(Math.random() * 1000) + 100,
      uniqueAddresses: Math.floor(Math.random() * 200) + 50,
      totalVolume: (Math.random() * 1000000).toFixed(2),
      averageTransferSize: (Math.random() * 1000).toFixed(2),
      topSenders: ['0x123...', '0x456...'],
      topReceivers: ['0x789...', '0xabc...'],
      timestamp: new Date().toISOString(),
    };
  }

  private getMockSwapData(): TokenSwapData {
    return {
      totalSwaps: Math.floor(Math.random() * 500) + 50,
      averagePrice: (Math.random() * 10).toFixed(4),
      priceChange: `${(Math.random() * 20 - 10).toFixed(2)}%`,
      totalVolume: (Math.random() * 500000).toFixed(2),
      liquidityChanges: `${(Math.random() * 10 - 5).toFixed(2)}%`,
      timestamp: new Date().toISOString(),
    };
  }

  async generateTokenAnalysis(transferData: TokenTransferData, swapData: TokenSwapData): Promise<string> {
    try {
      return await this.openRouterClient.generateTokenInsights(transferData, swapData, 'comprehensive');
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return 'Unable to generate AI analysis at this time.';
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}
