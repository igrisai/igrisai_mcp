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
   * Analyze social activity data using AI
   */
  async analyzeSocialActivity(socialData: any[]): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain and social media analyst. Analyze the provided social activity data and provide insights about user engagement, sentiment trends, and potential market implications. Be concise but informative.`,
      },
      {
        role: 'user',
        content: `Please analyze this social activity data: ${JSON.stringify(socialData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Analyze on-chain transaction data using AI
   */
  async analyzeOnChainData(transactionData: any[]): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain analyst. Analyze the provided on-chain transaction data and provide insights about trading patterns, volume trends, and potential market movements. Focus on actionable insights.`,
      },
      {
        role: 'user',
        content: `Please analyze this on-chain transaction data: ${JSON.stringify(transactionData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Generate comprehensive analysis combining social and on-chain data
   */
  async generateComprehensiveAnalysis(
    socialData: any[],
    onChainData: any[]
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert blockchain and social media analyst. Provide a comprehensive analysis combining social activity and on-chain transaction data. Identify correlations, trends, and potential investment opportunities. Be thorough but concise.`,
      },
      {
        role: 'user',
        content: `Please provide a comprehensive analysis combining this social activity data: ${JSON.stringify(socialData, null, 2)} and this on-chain data: ${JSON.stringify(onChainData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.4,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Generate trading recommendations based on analysis
   */
  async generateTradingRecommendations(analysisData: any): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are a professional trading analyst. Based on the provided analysis data, generate actionable trading recommendations. Include risk assessment and potential entry/exit points. Always remind users that this is not financial advice.`,
      },
      {
        role: 'user',
        content: `Based on this analysis data, provide trading recommendations: ${JSON.stringify(analysisData, null, 2)}`,
      },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.2,
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || 'No recommendations available';
  }
}
