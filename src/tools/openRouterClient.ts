import axios from 'axios';
import { mcpConfig } from '../config/index.js';
import { MCPToolInfo, AIToolSelection } from '../types/index.js';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = mcpConfig.openrouter.apiKey;
    this.baseUrl = mcpConfig.openrouter.baseUrl || 'https://openrouter.ai/api/v1';
    this.model = mcpConfig.openrouter.model || 'anthropic/claude-3.5-sonnet';
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async chatCompletion(
    messages: OpenRouterMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): Promise<OpenRouterResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.max_tokens || 1000,
          top_p: options?.top_p || 1,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://igrisai-mcp.com',
            'X-Title': 'IgrisAI MCP Client',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw new Error(`Failed to call OpenRouter API: ${error}`);
    }
  }

  /**
   * Analyze token transfer data using AI
   */
  async analyzeTokenTransfers(transferData: any): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain analyst specializing in token transfer analysis. Analyze the provided token transfer data and provide insights about transfer patterns, volume trends, address behavior, and potential market implications. Be concise but informative.`,
      },
      {
        role: 'user',
        content: `Please analyze this token transfer data: ${JSON.stringify(transferData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Analyze token swap data using AI
   */
  async analyzeTokenSwaps(swapData: any): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert DeFi analyst specializing in token swap analysis. Analyze the provided token swap data and provide insights about trading patterns, price movements, liquidity changes, and potential market trends. Focus on actionable insights.`,
      },
      {
        role: 'user',
        content: `Please analyze this token swap data: ${JSON.stringify(swapData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Generate comprehensive token insights combining transfer and swap data
   */
  async generateTokenInsights(
    transferData: any,
    swapData: any,
    analysisType: string = 'comprehensive'
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain analyst specializing in comprehensive token analysis. Provide a ${analysisType} analysis combining token transfer and swap data. Identify correlations, trends, and potential investment opportunities. Be thorough but concise.`,
      },
      {
        role: 'user',
        content: `Please provide a ${analysisType} analysis combining this transfer data: ${JSON.stringify(transferData, null, 2)} and this swap data: ${JSON.stringify(swapData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.4,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Analyze user prompt and select appropriate MCP tool using AI
   */
  async selectToolForPrompt(userPrompt: string, availableTools: MCPToolInfo[]): Promise<AIToolSelection> {
    // Convert MCP tools to OpenRouter function format
    const tools = availableTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain data analyst. You have access to MCP tools for fetching blockchain data. Analyze the user's request and select the most appropriate tool to fulfill their needs. 

Available tools:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Respond with a JSON object containing:
- selectedTool: the name of the tool to use
- parameters: the parameters to pass to the tool
- reasoning: brief explanation of why this tool was selected

Example response:
{
  "selectedTool": "get_token_transfers",
  "parameters": {
    "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C",
    "chain": "ethereum",
    "timeframe": "24h"
  },
  "reasoning": "User wants transfer data for a specific token"
}`,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      const response = await this.chatCompletionWithTools(messages, tools, {
        temperature: 0.3,
        max_tokens: 500,
      });

      // Parse the AI response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Try to parse JSON response
      const parsedResponse = JSON.parse(content);
      
      return {
        selectedTool: parsedResponse.selectedTool,
        parameters: parsedResponse.parameters || {},
        reasoning: parsedResponse.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Error in AI tool selection:', error);
      throw new Error(`Failed to select tool: ${error}`);
    }
  }

  /**
   * Chat completion with tool calling support
   */
  private async chatCompletionWithTools(
    messages: OpenRouterMessage[],
    tools: any[],
    options: any = {}
  ): Promise<any> {
    const payload = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      tools: tools,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    };

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
