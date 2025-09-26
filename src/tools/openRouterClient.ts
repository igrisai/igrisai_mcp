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

    // Get current date and time for context (UTC)
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
    const currentTime = now.toISOString(); // Full ISO string (UTC)
    const currentDateFormatted = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'UTC'
    });

    // Build comprehensive system prompt with resources and prompts
    let systemPrompt = `You are an expert blockchain data analyst. You have access to MCP tools for fetching blockchain data.

CURRENT DATE AND TIME CONTEXT (UTC):
- Current Date: ${currentDateFormatted} (${currentDate})
- Current Time: ${currentTime} (UTC)
- When users ask for "today", use: ${currentDate}
- When users ask for "yesterday", use: ${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- When users ask for "recent" or "last few hours", use: ${new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${currentDate}
- When users ask for "this week", use: ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${currentDate}

CRITICAL INSTRUCTIONS:
1. When a user asks for blockchain data, immediately call the most appropriate tool
2. After gathering data with tools, provide a FINAL SUMMARY in your response
3. Do NOT keep making tool calls indefinitely - when you have enough information, provide a clear final answer
4. If you have no more tools to call, provide your final analysis and conclusion
5. For transfer queries, use the run_query tool to search for transfers involving the specified wallet address
6. Use the current date context above when interpreting time-based queries like "today", "yesterday", etc.
7. IMPORTANT: Always use LOWER() function for wallet address comparisons: WHERE LOWER(to) = LOWER('wallet_address')
8. For recent transactions, use broader date ranges to ensure you don't miss recent activity
9. If no results found, try querying both 'to' and 'from' fields to catch all transfers involving the wallet

COMPLETION RULE: When you have gathered sufficient data and have no more tools to call, provide a comprehensive final response about the token transfers, balances, or requested blockchain data.`;

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

    // Conversation loop - up to 10 iterations with circuit breaker
    let conversationMessages = [...messages];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    
    for (let iteration = 1; iteration <= 10; iteration++) {
      try {
        console.log(`AI conversation iteration ${iteration}/10`);
        
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
              
              // Debug: Log the tool response
              console.log(`🔍 Tool ${toolCall.function.name} response:`, JSON.stringify(result, null, 2));
              
              // Format tool result properly for OpenRouter
              const toolResult = {
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
              };
              
              toolResults.push(toolResult);
              console.log(`✅ Tool ${toolCall.function.name} executed successfully`);
              
            } catch (error) {
              console.error(`❌ Tool ${toolCall.function.name} failed:`, error);
              toolResults.push({
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: `Tool execution failed: ${error}`
              });
            }
          }
          
          // Add tool results to conversation
          conversationMessages.push(...toolResults);
          
          // Continue the conversation loop
          continue;
        }
        
        // No tool calls - check if AI provided final response
        if (message?.content && message.content.trim() !== '') {
          console.log(`✅ AI provided final response in iteration ${iteration}: ${message.content.substring(0, 100)}...`);
          
          // Return the final result
          return {
            selectedTool: 'conversation_complete',
            parameters: { iterations: iteration, finalResponse: message.content },
            reasoning: message.content
          };
        }
        
        // No tool calls and no content - AI is done but didn't provide response
        console.log(`⚠️ AI completed conversation in ${iteration} iterations but provided no final response`);
        
        // Return the final result
        return {
          selectedTool: 'conversation_complete',
          parameters: { iterations: iteration, finalResponse: 'No final response provided' },
          reasoning: 'Conversation completed but AI did not provide a final response'
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
    
    // Completion timeout: reached maximum iterations (10)
    console.log(`⏰ Reached maximum iterations (10), stopping conversation`);
    return {
      selectedTool: 'conversation_complete',
      parameters: { iterations: 10, finalResponse: 'Maximum iterations reached' },
      reasoning: 'Conversation completed after maximum iterations (10)'
    };
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
      messages: messages.map(msg => {
        const baseMessage: any = {
          role: msg.role,
          content: msg.content
        };
        
        // Add tool_calls for assistant messages
        if (msg.role === 'assistant' && msg.tool_calls) {
          baseMessage.tool_calls = msg.tool_calls;
        }
        
        // Add tool_call_id for tool messages
        if (msg.role === 'tool') {
          baseMessage.tool_call_id = msg.tool_call_id;
        }
        
        return baseMessage;
      }),
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
