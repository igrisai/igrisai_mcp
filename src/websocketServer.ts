import { WebSocketServer, WebSocket } from 'ws';
import { IgrisAIMCPClient } from './client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TokenActivityMessage {
  type: 'token_activity_update' | 'error' | 'connection_established' | 'prompt_execution_result';
  userAddress: string;
  tokenAddress?: string;
  chain?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  userAddress: string;
  subscribedTokens: Set<string>;
  lastActivity: Date;
}

export class TokenActivityWebSocketServer {
  private wss: WebSocketServer;
  private mcpClient: IgrisAIMCPClient;
  private connections: Map<string, WebSocketConnection> = new Map();
  private activityIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.mcpClient = new IgrisAIMCPClient();
    
    this.setupWebSocketServer();
    console.log(`WebSocket server started on port ${port}`);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection established');
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Send connection established message
      this.sendMessage(ws, {
        type: 'connection_established',
        userAddress: '',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    const { type, userAddress, tokenAddress, chain = 'ethereum' } = message;

    if (!userAddress) {
      this.sendError(ws, 'User address is required');
      return;
    }

    const connectionId = this.getConnectionId(ws);
    
    switch (type) {
      case 'subscribe_token_activity':
        await this.handleTokenSubscription(ws, userAddress, tokenAddress, chain);
        break;
      
      case 'unsubscribe_token_activity':
        this.handleTokenUnsubscription(ws, tokenAddress);
        break;
      
      case 'get_token_analysis':
        await this.handleTokenAnalysis(ws, userAddress, tokenAddress, chain);
        break;
      
      case 'execute_prompt':
        await this.handleUserPrompt(ws, userAddress, message.userPrompt);
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  private async handleTokenSubscription(ws: WebSocket, userAddress: string, tokenAddress: string, chain: string): Promise<void> {
    if (!tokenAddress) {
      this.sendError(ws, 'Token address is required for subscription');
      return;
    }

    const connectionId = this.getConnectionId(ws);
    
    // Store or update connection info
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, {
        ws,
        userAddress,
        subscribedTokens: new Set(),
        lastActivity: new Date(),
      });
    }

    const connection = this.connections.get(connectionId)!;
    connection.subscribedTokens.add(tokenAddress);
    connection.lastActivity = new Date();

    // Start monitoring this token if not already monitoring
    if (!this.activityIntervals.has(tokenAddress)) {
      await this.startTokenMonitoring(tokenAddress, chain);
    }

    console.log(`User ${userAddress} subscribed to token ${tokenAddress} activity on ${chain}`);
    
    this.sendMessage(ws, {
      type: 'token_activity_update',
      userAddress,
      tokenAddress,
      chain,
      data: { status: 'subscribed' },
      timestamp: new Date().toISOString(),
    });
  }

  private handleTokenUnsubscription(ws: WebSocket, tokenAddress: string): void {
    const connectionId = this.getConnectionId(ws);
    const connection = this.connections.get(connectionId);
    
    if (connection && tokenAddress) {
      connection.subscribedTokens.delete(tokenAddress);
      
      // Check if any other connections are monitoring this token
      const hasOtherSubscribers = Array.from(this.connections.values())
        .some(conn => conn.subscribedTokens.has(tokenAddress));
      
      if (!hasOtherSubscribers) {
        this.stopTokenMonitoring(tokenAddress);
      }
    }
  }

  private async handleUserPrompt(ws: WebSocket, userAddress: string, userPrompt: string): Promise<void> {
    if (!userPrompt) {
      this.sendError(ws, 'User prompt is required');
      return;
    }

    try {
      // Ensure MCP client is connected
      if (!this.mcpClient.isClientConnected()) {
        await this.mcpClient.connect();
      }

      // Execute user prompt using AI-driven tool selection
      const result = await this.mcpClient.executeUserPrompt(userPrompt);

      this.sendMessage(ws, {
        type: 'prompt_execution_result',
        userAddress,
        data: {
          toolUsed: result.toolUsed,
          reasoning: result.reasoning,
          parameters: result.parameters,
          result: result.result,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling user prompt:', error);
      this.sendError(ws, `Failed to execute prompt: ${error}`);
    }
  }

  private async handleTokenAnalysis(ws: WebSocket, userAddress: string, tokenAddress: string, chain: string): Promise<void> {
    if (!tokenAddress) {
      this.sendError(ws, 'Token address is required for analysis');
      return;
    }

    try {
      // Ensure MCP client is connected
      if (!this.mcpClient.isClientConnected()) {
        await this.mcpClient.connect();
      }

      // Get token data from MCP server
      const [transferData, swapData] = await Promise.all([
        this.mcpClient.getTokenTransfers(tokenAddress, chain, '24h'),
        this.mcpClient.getTokenSwaps(tokenAddress, chain, '24h'),
      ]);

      // Generate AI analysis
      const aiAnalysis = await this.mcpClient.generateTokenAnalysis(transferData, swapData);

      this.sendMessage(ws, {
        type: 'token_activity_update',
        userAddress,
        tokenAddress,
        chain,
        data: {
          transferData,
          swapData,
          aiAnalysis,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling token analysis:', error);
      this.sendError(ws, `Failed to analyze token: ${error}`);
    }
  }

  private async startTokenMonitoring(tokenAddress: string, chain: string): Promise<void> {
    console.log(`Starting monitoring for token ${tokenAddress} on ${chain}`);
    
    // Monitor token activity every 30 seconds
    const interval = setInterval(async () => {
      try {
        // Ensure MCP client is connected
        if (!this.mcpClient.isClientConnected()) {
          await this.mcpClient.connect();
        }

        // Get latest token data
        const [transferData, swapData] = await Promise.all([
          this.mcpClient.getTokenTransfers(tokenAddress, chain, '1h'),
          this.mcpClient.getTokenSwaps(tokenAddress, chain, '1h'),
        ]);

        // Send updates to all subscribed connections
        this.broadcastTokenUpdate(tokenAddress, transferData, swapData);
      } catch (error) {
        console.error(`Error monitoring token ${tokenAddress}:`, error);
        // Broadcast error to subscribers
        this.broadcastError(tokenAddress, `Failed to get live data for token ${tokenAddress}: ${error}`);
      }
    }, 30000); // 30 seconds

    this.activityIntervals.set(tokenAddress, interval);
  }

  private stopTokenMonitoring(tokenAddress: string): void {
    const interval = this.activityIntervals.get(tokenAddress);
    if (interval) {
      clearInterval(interval);
      this.activityIntervals.delete(tokenAddress);
      console.log(`Stopped monitoring token ${tokenAddress}`);
    }
  }

  private broadcastTokenUpdate(tokenAddress: string, transferData: any, swapData: any): void {
    const message: TokenActivityMessage = {
      type: 'token_activity_update',
      userAddress: '',
      tokenAddress,
      data: {
        transferData,
        swapData,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Send to all connections subscribed to this token
    this.connections.forEach((connection) => {
      if (connection.subscribedTokens.has(tokenAddress)) {
        message.userAddress = connection.userAddress;
        this.sendMessage(connection.ws, message);
      }
    });
  }

  private handleDisconnection(ws: WebSocket): void {
    const connectionId = this.getConnectionId(ws);
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      // Stop monitoring tokens that no longer have subscribers
      connection.subscribedTokens.forEach(tokenAddress => {
        const hasOtherSubscribers = Array.from(this.connections.values())
          .some(conn => conn !== connection && conn.subscribedTokens.has(tokenAddress));
        
        if (!hasOtherSubscribers) {
          this.stopTokenMonitoring(tokenAddress);
        }
      });
      
      this.connections.delete(connectionId);
      console.log(`Connection ${connectionId} disconnected`);
    }
  }

  private getConnectionId(ws: WebSocket): string {
    return ws.url || Math.random().toString(36).substring(7);
  }

  private sendMessage(ws: WebSocket, message: TokenActivityMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastError(tokenAddress: string, errorMessage: string): void {
    // Send error to all connections subscribed to this token
    this.connections.forEach((connection) => {
      if (connection.subscribedTokens.has(tokenAddress)) {
        const errorMessage_obj = {
          type: 'error' as const,
          userAddress: connection.userAddress,
          tokenAddress,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
        this.sendMessage(connection.ws, errorMessage_obj);
      }
    });
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      userAddress: '',
      error,
      timestamp: new Date().toISOString(),
    });
  }

  async start(): Promise<void> {
    try {
      await this.mcpClient.connect();
      console.log('Token Activity WebSocket Server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Clear all monitoring intervals
    this.activityIntervals.forEach((interval) => clearInterval(interval));
    this.activityIntervals.clear();
    
    // Close all connections
    this.connections.forEach((connection) => {
      connection.ws.close();
    });
    this.connections.clear();
    
    // Disconnect MCP client
    await this.mcpClient.disconnect();
    
    // Close WebSocket server
    this.wss.close();
    console.log('Token Activity WebSocket Server stopped');
  }
}
