import axios from 'axios';
import { mcpConfig } from '../config/index.js';

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
}
