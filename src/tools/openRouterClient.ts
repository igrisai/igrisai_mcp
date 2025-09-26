import axios from 'axios';
import { mcpConfig } from '../config/index.js';
import { MCPToolInfo, AIToolSelection } from '../types/index.js';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
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
    this.model = mcpConfig.openrouter.model!;
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
   * Analyze user prompt and execute tools in a conversation loop
   */
  async selectToolForPrompt(userPrompt: string, availableTools: MCPToolInfo[], availableResources: any[] = [], availablePrompts: any[] = [], mcpClient: any): Promise<AIToolSelection> {
    // Convert MCP tools to OpenRouter function format
    const tools = availableTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));

    // Build comprehensive system prompt with resources and prompts
    let systemPrompt = `You are an expert blockchain data analyst. You have access to MCP tools for fetching blockchain data.

When a user asks for blockchain data, immediately call the most appropriate tool. Do not explain your reasoning - just make the tool call.

IMPORTANT: For transfer queries, use the run_query tool to search for transfers involving the specified wallet address.`;

    // Add resources information if available
    if (availableResources.length > 0) {
      systemPrompt += `\n\nAvailable Resources (these contain important information about how to use the tools):`;
      for (const resource of availableResources) {
        systemPrompt += `\n- ${resource.name}: ${resource.description || 'No description available'}`;
      }
    }

    // Add prompts information if available
    if (availablePrompts.length > 0) {
      systemPrompt += `\n\nAvailable Prompts (these show example usage patterns):`;
      for (const prompt of availablePrompts) {
        systemPrompt += `\n- ${prompt.name}: ${prompt.description || 'No description available'}`;
        if (prompt.arguments) {
          systemPrompt += `\n  Arguments: ${JSON.stringify(prompt.arguments, null, 2)}`;
        }
      }
    }

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    // Conversation loop - up to 5 iterations with circuit breaker
    let conversationMessages = [...messages];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    
    for (let iteration = 1; iteration <= 5; iteration++) {
      try {
        console.log(`AI conversation iteration ${iteration}/5`);
        
        const response = await this.chatCompletionWithTools(conversationMessages, tools, {
          temperature: 0.3,
          max_tokens: 2000,
        });

        // Reset failure counter on success
        consecutiveFailures = 0;
        
        const message = response.choices[0]?.message;
        console.log(`Message (iteration ${iteration}):`, JSON.stringify(message, null, 2));
        
        // Add AI response to conversation
        conversationMessages.push({
          role: 'assistant',
          content: message?.content || '',
          tool_calls: message?.tool_calls
        });
        
        // Check if AI made tool calls
        if (message?.tool_calls && message.tool_calls.length > 0) {
          console.log(`🔧 AI made ${message.tool_calls.length} tool call(s) in iteration ${iteration}`);
          
          // Execute all tool calls
          const toolResults = [];
          for (const toolCall of message.tool_calls) {
            try {
              console.log(`Executing tool: ${toolCall.function.name} with args:`, toolCall.function.arguments);
              
              const result = await mcpClient.callTool({
                name: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments),
              });
              
              // Format tool result properly for OpenRouter
              const toolResult = {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                name: toolCall.function.name,
                content: typeof result === 'string' ? result : JSON.stringify(result)
              };
              
              toolResults.push(toolResult);
              console.log(`✅ Tool ${toolCall.function.name} executed successfully`);
              
            } catch (error) {
              console.error(`❌ Tool ${toolCall.function.name} failed:`, error);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                name: toolCall.function.name,
                content: `Tool execution failed: ${error}`
              });
            }
          }
          
          // Add tool results to conversation
          conversationMessages.push(...toolResults);
          
          // Continue the conversation loop
          continue;
        }
        
        // No more tool calls - AI is done
        console.log(`✅ AI completed conversation in ${iteration} iterations`);
        
        // Return the final result
        return {
          selectedTool: 'conversation_complete',
          parameters: { iterations: iteration, finalResponse: message?.content },
          reasoning: message?.content || 'Conversation completed successfully'
        };
        
      } catch (error) {
        consecutiveFailures++;
        console.error(`❌ Iteration ${iteration} failed (${consecutiveFailures}/${maxConsecutiveFailures}):`, error);
        
        // Circuit breaker: stop if too many consecutive failures
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`🚨 Circuit breaker triggered: ${consecutiveFailures} consecutive failures`);
          throw new Error(`Conversation failed after ${consecutiveFailures} consecutive failures: ${error}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error: conversation loop completed without success');
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
