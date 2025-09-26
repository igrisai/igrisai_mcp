import { GraphMCPTools } from './tools/graphMCPTools.js';
import { OpenRouterClient } from './tools/openRouterClient.js';
import { MCPToolDefinition } from './types/index.js';
import { SocialActivityQuerySchema, OnChainQuerySchema, TokenAnalysisSchema, PortfolioAnalysisSchema } from './types/schemas.js';

export class IgrisAIMCPClient {
  private graphTools: GraphMCPTools;
  private openRouterClient: OpenRouterClient;
  private tools: MCPToolDefinition[] = [];

  constructor() {
    this.graphTools = new GraphMCPTools();
    this.openRouterClient = new OpenRouterClient();
    
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'query_social_activity',
        description: 'Query social activity data from various platforms (Twitter, Telegram, Discord, Reddit)',
        inputSchema: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              enum: ['twitter', 'telegram', 'discord', 'reddit'],
              description: 'Social media platform to query',
            },
            username: {
              type: 'string',
              description: 'Username or handle to analyze',
            },
            timeframe: {
              type: 'string',
              enum: ['1h', '24h', '7d', '30d'],
              description: 'Time period for analysis',
              default: '24h',
            },
          },
          required: ['platform', 'username'],
        },
        handler: this.handleSocialActivityQuery.bind(this),
      },
      {
        name: 'query_onchain_transactions',
        description: 'Query on-chain transaction data using The Graph protocol',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Wallet address to analyze',
            },
            chain: {
              type: 'string',
              enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
              description: 'Blockchain network',
              default: 'ethereum',
            },
            timeframe: {
              type: 'string',
              enum: ['1h', '24h', '7d', '30d'],
              description: 'Time period for analysis',
              default: '24h',
            },
            transactionType: {
              type: 'string',
              enum: ['swap', 'transfer', 'mint', 'burn', 'all'],
              description: 'Type of transactions to include',
              default: 'all',
            },
          },
          required: ['address'],
        },
        handler: this.handleOnChainQuery.bind(this),
      },
      {
        name: 'analyze_token_performance',
        description: 'Analyze token performance combining social and on-chain data',
        inputSchema: {
          type: 'object',
          properties: {
            tokenAddress: {
              type: 'string',
              description: 'Token contract address',
            },
            chain: {
              type: 'string',
              enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
              description: 'Blockchain network',
              default: 'ethereum',
            },
            includeSocial: {
              type: 'boolean',
              description: 'Include social media analysis',
              default: true,
            },
            includeOnChain: {
              type: 'boolean',
              description: 'Include on-chain transaction analysis',
              default: true,
            },
          },
          required: ['tokenAddress'],
        },
        handler: this.handleTokenAnalysis.bind(this),
      },
      {
        name: 'analyze_portfolio',
        description: 'Analyze portfolio performance across multiple addresses and chains',
        inputSchema: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of wallet addresses to analyze',
            },
            chains: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
              },
              description: 'Blockchain networks to include',
            },
            timeframe: {
              type: 'string',
              enum: ['1h', '24h', '7d', '30d'],
              description: 'Time period for analysis',
              default: '24h',
            },
          },
          required: ['addresses'],
        },
        handler: this.handlePortfolioAnalysis.bind(this),
      },
      {
        name: 'generate_ai_analysis',
        description: 'Generate AI-powered analysis using OpenRouter',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Data to analyze (social activity, on-chain data, or both)',
            },
            analysisType: {
              type: 'string',
              enum: ['social', 'onchain', 'comprehensive', 'trading'],
              description: 'Type of analysis to generate',
            },
          },
          required: ['data', 'analysisType'],
        },
        handler: this.handleAIAnalysis.bind(this),
      },
    ];
  }

  private async handleSocialActivityQuery(args: any): Promise<any> {
    try {
      const validatedArgs = SocialActivityQuerySchema.parse(args);
      const socialData = await this.graphTools.querySocialActivity(validatedArgs);
      
      return {
        content: [
          {
            type: 'text',
            text: `Social Activity Analysis for ${validatedArgs.username} on ${validatedArgs.platform}:\n\n${JSON.stringify(socialData, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error querying social activity: ${error}`,
          },
        ],
      };
    }
  }

  private async handleOnChainQuery(args: any): Promise<any> {
    try {
      const validatedArgs = OnChainQuerySchema.parse(args);
      const transactions = await this.graphTools.queryOnChainTransactions(validatedArgs);
      
      return {
        content: [
          {
            type: 'text',
            text: `On-Chain Transaction Analysis for ${validatedArgs.address} on ${validatedArgs.chain}:\n\n${JSON.stringify(transactions, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error querying on-chain transactions: ${error}`,
          },
        ],
      };
    }
  }

  private async handleTokenAnalysis(args: any): Promise<any> {
    try {
      const validatedArgs = TokenAnalysisSchema.parse(args);
      const analysis = await this.graphTools.analyzeTokenPerformance(validatedArgs);
      
      return {
        content: [
          {
            type: 'text',
            text: `Token Performance Analysis for ${validatedArgs.tokenAddress}:\n\n${JSON.stringify(analysis, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing token performance: ${error}`,
          },
        ],
      };
    }
  }

  private async handlePortfolioAnalysis(args: any): Promise<any> {
    try {
      const validatedArgs = PortfolioAnalysisSchema.parse(args);
      const analysis = await this.graphTools.analyzePortfolio(validatedArgs);
      
      return {
        content: [
          {
            type: 'text',
            text: `Portfolio Analysis:\n\n${JSON.stringify(analysis, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing portfolio: ${error}`,
          },
        ],
      };
    }
  }

  private async handleAIAnalysis(args: any): Promise<any> {
    try {
      const { data, analysisType } = args;
      let analysis: string;

      switch (analysisType) {
        case 'social':
          analysis = await this.openRouterClient.analyzeSocialActivity(data);
          break;
        case 'onchain':
          analysis = await this.openRouterClient.analyzeOnChainData(data);
          break;
        case 'comprehensive':
          analysis = await this.openRouterClient.generateComprehensiveAnalysis(
            data.social || [],
            data.onChain || []
          );
          break;
        case 'trading':
          analysis = await this.openRouterClient.generateTradingRecommendations(data);
          break;
        default:
          throw new Error(`Unsupported analysis type: ${analysisType}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `AI Analysis (${analysisType}):\n\n${analysis}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating AI analysis: ${error}`,
          },
        ],
      };
    }
  }

  async connect(): Promise<void> {
    console.log('IgrisAI MCP Client initialized successfully');
  }

  async disconnect(): Promise<void> {
    console.log('IgrisAI MCP Client disconnected');
  }

  getAvailableTools(): MCPToolDefinition[] {
    return this.tools;
  }
}
