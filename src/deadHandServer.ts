import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { DatabaseManager } from './database.js';
import { CronScheduler } from './cronScheduler.js';
import { IgrisAIMCPClient } from './client.js';
import { twitterSyncService } from './twitterSyncService.js';
import { InitiateDeadHandRequest, InitiateDeadHandResponse, DeadHandCheckResult } from './types/deadHand.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class DeadHandServer {
  private app: express.Application;
  private server: any;
  private wss!: WebSocketServer;
  private db: DatabaseManager;
  private cronScheduler: CronScheduler;
  private mcpClient: IgrisAIMCPClient;
  private connections: Map<string, any> = new Map();
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.db = new DatabaseManager();
    this.cronScheduler = new CronScheduler();
    this.mcpClient = new IgrisAIMCPClient();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocketServer();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbConnected = await this.db.testConnection();
        const cronStatus = this.cronScheduler.getStatus();
        
        res.json({
          status: 'healthy',
          database: dbConnected ? 'connected' : 'disconnected',
          cron: cronStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Initiate dead hand endpoint
    this.app.post('/initiate-deadhand', async (req, res) => {
      try {
        const { userAddress }: InitiateDeadHandRequest = req.body;

        // Validate input
        if (!userAddress || typeof userAddress !== 'string') {
          const response: InitiateDeadHandResponse = {
            status: 'error',
            message: 'Invalid user address provided',
            error: 'userAddress is required and must be a string'
          };
          return res.status(400).json(response);
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
          const response: InitiateDeadHandResponse = {
            status: 'error',
            message: 'Invalid Ethereum address format',
            error: 'userAddress must be a valid Ethereum address'
          };
          return res.status(400).json(response);
        }

        console.log(`Initiating dead hand check for user: ${userAddress}`);

        // Get dead hand config from database
        const config = await this.db.getDeadHandConfig(userAddress);
        
        if (!config) {
          const response: InitiateDeadHandResponse = {
            status: 'error',
            message: 'No dead hand configuration found for this user',
            error: 'User not found in database'
          };
          return res.status(404).json(response);
        }

        // Check if there's already an active job for this user
        const existingJob = this.cronScheduler.getJobByUserAddress(userAddress);
        if (existingJob) {
          const response: InitiateDeadHandResponse = {
            status: 'error',
            message: 'Dead hand check already scheduled for this user',
            error: 'User already has an active dead hand check'
          };
          return res.status(409).json(response);
        }

        // Trigger Twitter sync service (async, non-blocking)
        this.triggerTwitterSync(userAddress).catch(error => {
          console.error(`Twitter sync failed for ${userAddress}:`, error);
        });

        // Schedule the dead hand check
        const scheduledAt = new Date(Date.now() + config.timeoutSeconds * 1000);
        const jobId = this.cronScheduler.scheduleDeadHandCheck(
          userAddress,
          config.timeoutSeconds,
          this.handleDeadHandCheck.bind(this)
        );

        const response: InitiateDeadHandResponse = {
          status: 'success',
          message: 'Dead hand check initiated successfully',
          scheduledAt: scheduledAt.toISOString(),
          timeoutSeconds: config.timeoutSeconds
        };

        console.log(`Dead hand check scheduled for ${userAddress} in ${config.timeoutSeconds} seconds`);
        res.json(response);

      } catch (error) {
        console.error('Error initiating dead hand check:', error);
        
        const response: InitiateDeadHandResponse = {
          status: 'error',
          message: 'Failed to initiate dead hand check',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        res.status(500).json(response);
      }
    });

    // Get active jobs endpoint
    this.app.get('/jobs', (req, res) => {
      try {
        const activeJobs = this.cronScheduler.getActiveJobs();
        const status = this.cronScheduler.getStatus();
        
        res.json({
          status: 'success',
          data: {
            activeJobs,
            status
          }
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to get active jobs',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Cancel job endpoint
    this.app.delete('/jobs/:jobId', (req, res) => {
      try {
        const { jobId } = req.params;
        const cancelled = this.cronScheduler.cancelDeadHandCheck(jobId);
        
        if (cancelled) {
          res.json({
            status: 'success',
            message: 'Job cancelled successfully'
          });
        } else {
          res.status(404).json({
            status: 'error',
            message: 'Job not found'
          });
        }
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to cancel job',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  private setupWebSocketServer(): void {
    this.wss = new WebSocketServer({ noServer: true });
    
    this.wss.on('connection', (ws: any, request) => {
      console.log('New WebSocket connection established');
      
      // Store the connection immediately upon connection
      const connectionId = this.getWebSocketConnectionId(ws);
      this.connections.set(connectionId, {
        ws,
        userAddress: '', // Will be set when user sends a message
        subscribedTokens: new Set(),
        lastActivity: new Date(),
      });
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendWebSocketError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleWebSocketDisconnection(ws);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        this.handleWebSocketDisconnection(ws);
      });

      // Send connection established message
      this.sendWebSocketMessage(ws, {
        type: 'connection_established',
        userAddress: '',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async handleWebSocketMessage(ws: any, message: any): Promise<void> {
    const { type, userAddress, tokenAddress, chain = 'ethereum' } = message;

    const connectionId = this.getWebSocketConnectionId(ws);
    
    // Update connection with user address if provided
    if (userAddress && this.connections.has(connectionId)) {
      const connection = this.connections.get(connectionId);
      connection.userAddress = userAddress;
      connection.lastActivity = new Date();
    }

    if (!userAddress) {
      this.sendWebSocketError(ws, 'User address is required');
      return;
    }
    
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
        this.sendWebSocketError(ws, `Unknown message type: ${type}`);
    }
  }

  private async handleTokenSubscription(ws: any, userAddress: string, tokenAddress: string, chain: string): Promise<void> {
    if (!tokenAddress) {
      this.sendWebSocketError(ws, 'Token address is required for subscription');
      return;
    }

    const connectionId = this.getWebSocketConnectionId(ws);
    
    // Store or update connection info
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, {
        ws,
        userAddress,
        subscribedTokens: new Set(),
        lastActivity: new Date(),
      });
    }
    
    const connection = this.connections.get(connectionId);
    connection.subscribedTokens.add(tokenAddress);
    connection.userAddress = userAddress;
    connection.lastActivity = new Date();
    
    console.log(`User ${userAddress} subscribed to token ${tokenAddress} activity on ${chain}`);
    
    this.sendWebSocketMessage(ws, {
      type: 'token_activity_update',
      userAddress,
      tokenAddress,
      chain,
      data: { status: 'subscribed' },
      timestamp: new Date().toISOString(),
    });
  }

  private handleTokenUnsubscription(ws: any, tokenAddress: string): void {
    const connectionId = this.getWebSocketConnectionId(ws);
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      connection.subscribedTokens.delete(tokenAddress);
      console.log(`User ${connection.userAddress} unsubscribed from token ${tokenAddress} activity`);
      
      this.sendWebSocketMessage(ws, {
        type: 'token_activity_update',
        userAddress: connection.userAddress,
        tokenAddress,
        data: { status: 'unsubscribed' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleUserPrompt(ws: any, userAddress: string, userPrompt: string): Promise<void> {
    if (!userPrompt) {
      this.sendWebSocketError(ws, 'User prompt is required');
      return;
    }

    try {
      // Execute user prompt using AI-driven tool selection
      const result = await this.mcpClient.executeUserPrompt(userPrompt);

      this.sendWebSocketMessage(ws, {
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
      this.sendWebSocketError(ws, `Failed to execute prompt: ${error}`);
    }
  }

  private async handleTokenAnalysis(ws: any, userAddress: string, tokenAddress: string, chain: string): Promise<void> {
    if (!tokenAddress) {
      this.sendWebSocketError(ws, 'Token address is required for analysis');
      return;
    }

    try {
      // Use AI-driven approach to get token analysis with wallet address context
      const prompt = `Check if any tokens have been transferred to wallet address ${userAddress} today. Also check for any transfers sent from this wallet address. Analyze token ${tokenAddress} on ${chain} network for this wallet.`;
      const result = await this.mcpClient.executeUserPrompt(prompt);

      this.sendWebSocketMessage(ws, {
        type: 'token_activity_update',
        userAddress,
        tokenAddress,
        chain,
        data: {
          toolUsed: result.toolUsed,
          reasoning: result.reasoning,
          parameters: result.parameters,
          result: result.result,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling token analysis:', error);
      this.sendWebSocketError(ws, `Failed to analyze token: ${error}`);
    }
  }

  /**
   * Handle dead hand check when cron job triggers
   */
  private async handleDeadHandCheck(userAddress: string): Promise<void> {
    try {
      console.log(`Executing dead hand check for ${userAddress}`);
      
      // Get config again to ensure we have the latest data
      const config = await this.db.getDeadHandConfig(userAddress);
      if (!config) {
        console.error(`No config found for user ${userAddress} during dead hand check`);
        return;
      }

      // Execute dead hand check
      const result = await this.executeDeadHandCheck(userAddress, config.timeoutSeconds);
      
      console.log(`Dead hand check completed for ${userAddress}. Activity found: ${result.activityFound}`);
      console.log(`Smart account: ${config.smartAccount}`);
      
      if (!result.activityFound) {
        // No activity found - trigger dead hand switch
        console.log(`No activity found for ${userAddress}. Triggering dead hand switch.`);
        await this.triggerDeadHandSwitch(userAddress, config.smartAccount);
      } else {
        // Activity found - reset the timer
        console.log(`Activity found for ${userAddress}. Resetting timer for ${config.timeoutSeconds} seconds.`);
        await this.resetDeadHandTimer(userAddress, config.timeoutSeconds);
      }
      
    } catch (error) {
      console.error(`Error in dead hand check for ${userAddress}:`, error);
    }
  }

  /**
   * Trigger Twitter sync for a user (separate service)
   */
  private async triggerTwitterSync(userAddress: string): Promise<void> {
    try {
      console.log(`Triggering Twitter sync for ${userAddress}`);
      
      // Get Twitter OAuth credentials from database
      const twitterAuth = await this.db.getTwitterAuth(userAddress);
      
      if (!twitterAuth) {
        console.log(`No Twitter auth found for ${userAddress} - skipping Twitter sync`);
        return;
      }
      
      // Fetch and sync Twitter activities
      const activities = await twitterSyncService.syncTwitterActivities(userAddress, 24); // Last 24 hours
      
      console.log(`Twitter sync completed for ${userAddress}: ${activities.length} activities`);
      
    } catch (error) {
      console.error(`Twitter sync failed for ${userAddress}:`, error);
      // Don't throw error - Twitter sync failure shouldn't break dead hand check
    }
  }

  /**
   * Execute dead hand check for a user
   */
  private async executeDeadHandCheck(userAddress: string, timeoutSeconds: number): Promise<DeadHandCheckResult> {
    try {
      console.log(`Executing dead hand check for ${userAddress} (timeout: ${timeoutSeconds}s)`);
      
      // Broadcast initial status
      this.broadcastAIStatus(userAddress, 'Starting dead hand check...', 'info');
      
      // Create AI prompt for recent transaction check
      const prompt = `Check for ALL token transfers (both received and sent) for wallet address ${userAddress} on polygon in the last ${timeoutSeconds} seconds. Include both ERC-20 tokens and native MATIC transfers. Provide a detailed analysis of any activity found.`;
      
      // Broadcast AI prompt
      this.broadcastAIStatus(userAddress, `AI Prompt: ${prompt}`, 'prompt');
      
      // Execute AI-driven analysis
      const result = await this.mcpClient.executeUserPrompt(prompt);
      
      // Broadcast AI tool usage
      this.broadcastAIStatus(userAddress, `AI used tool: ${result.toolUsed}`, 'tool_usage');
      
      // Broadcast AI reasoning
      this.broadcastAIStatus(userAddress, `AI Reasoning: ${result.reasoning}`, 'reasoning');
      
      // Extract transaction data from AI result
      const transactionData = result.parameters?.finalResponse || result.reasoning || 'No transaction data available';
      const activityFound = this.determineActivityFromAIResponse(result.reasoning);
      
      // Check Twitter activity from Hypergraph (placeholder for now)
      this.broadcastAIStatus(userAddress, 'Checking Twitter activities from Hypergraph...', 'twitter_check');
      const twitterActivityFound = await this.checkTwitterActivityFromHypergraph(userAddress, timeoutSeconds);
      
      // Combined activity determination
      const combinedActivityFound = activityFound || twitterActivityFound;
      this.broadcastAIStatus(userAddress, 
        `Activity Analysis: Blockchain ${activityFound ? '✅' : '❌'} | Twitter ${twitterActivityFound ? '✅' : '❌'}`, 
        'combined_analysis'
      );
      
      const deadHandResult: DeadHandCheckResult = {
        type: 'deadhand_check_result',
        userAddress,
        aiResponse: result.reasoning || 'Checking Graph token MCP for information',
        transactionData: Array.isArray(transactionData) ? transactionData : [transactionData],
        activityFound: combinedActivityFound,
        timestamp: new Date().toISOString()
      };

      // Broadcast final result
      this.broadcastDeadHandResult(deadHandResult);

      console.log(`Dead hand check completed for ${userAddress}. Activity found: ${activityFound}`);
      return deadHandResult;

    } catch (error) {
      console.error(`Error executing dead hand check for ${userAddress}:`, error);
      
      // Broadcast error status
      this.broadcastAIStatus(userAddress, `Error: ${error}`, 'error');
      
      const errorResult: DeadHandCheckResult = {
        type: 'deadhand_check_result',
        userAddress,
        aiResponse: 'Error occurred while checking transactions',
        transactionData: [],
        activityFound: false,
        timestamp: new Date().toISOString()
      };

      return errorResult;
    }
  }

  /**
   * Check Twitter activity from Hypergraph (placeholder implementation)
   */
  private async checkTwitterActivityFromHypergraph(userAddress: string, timeoutSeconds: number): Promise<boolean> {
    try {
      // TODO: Implement Hypergraph query when we add Hypergraph integration
      // For now, return false as placeholder
      console.log(`Checking Twitter activity from Hypergraph for ${userAddress} (last ${timeoutSeconds}s)`);
      
      // Placeholder: In real implementation, this would query Hypergraph
      // const activities = await hypergraph.query(TwitterActivity, {
      //   filter: {
      //     userAddress,
      //     timestamp: { $gte: new Date(Date.now() - timeoutSeconds * 1000) }
      //   }
      // });
      
      return false; // Placeholder
      
    } catch (error) {
      console.error(`Error checking Twitter activity for ${userAddress}:`, error);
      return false;
    }
  }

  /**
   * Determine if activity was found based on AI response
   */
  private determineActivityFromAIResponse(aiResponse: string): boolean {
    if (!aiResponse) return false;
    
    const response = aiResponse.toLowerCase();
    
    // Look for indicators of activity
    const activityIndicators = [
      'transfer found',
      'transaction found',
      'activity found',
      'transfers identified',
      'transactions identified',
      'received',
      'sent',
      'transfer',
      'transaction'
    ];
    
    // Look for indicators of no activity
    const noActivityIndicators = [
      'no transfer',
      'no transaction',
      'no activity',
      '0 transfer',
      '0 transaction',
      'no results',
      'no data'
    ];
    
    // Check for no activity indicators first
    for (const indicator of noActivityIndicators) {
      if (response.includes(indicator)) {
        return false;
      }
    }
    
    // Check for activity indicators
    for (const indicator of activityIndicators) {
      if (response.includes(indicator)) {
        return true;
      }
    }
    
    // Default to false if unclear
    return false;
  }

  /**
   * Trigger dead hand switch (placeholder for future implementation)
   */
  private async triggerDeadHandSwitch(userAddress: string, smartAccount: string): Promise<void> {
    try {
      console.log(`🚨 DEAD HAND SWITCH TRIGGERED for ${userAddress}`);
      console.log(`Smart Account: ${smartAccount}`);
      
      // Broadcast dead hand switch initiation
      this.broadcastAIStatus(userAddress, '🚨 DEAD HAND SWITCH INITIATED', 'deadhand_initiated');
      this.broadcastAIStatus(userAddress, `Smart Account: ${smartAccount}`, 'smart_account');
      
      // TODO: Implement actual dead hand switch logic
      // This could include:
      // - Transfer funds to a safe address
      // - Execute smart contract functions
      // - Send notifications
      // - Log the event
      
      // Simulate dead hand switch steps
      this.broadcastAIStatus(userAddress, 'Step 1: Analyzing wallet balances...', 'deadhand_step');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      
      this.broadcastAIStatus(userAddress, 'Step 2: Preparing fund transfer to nomine.igrisai.xyz...', 'deadhand_step');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      
      this.broadcastAIStatus(userAddress, 'Step 3: Executing smart contract transaction...', 'deadhand_step');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      
      this.broadcastAIStatus(userAddress, '✅ Dead hand switch completed successfully', 'deadhand_completed');
      
      // For now, just log the event
      console.log(`Dead hand switch executed for user ${userAddress} with smart account ${smartAccount}`);
      
      // Broadcast dead hand switch event via WebSocket
      this.broadcastDeadHandSwitchEvent(userAddress, smartAccount);
      
    } catch (error) {
      console.error(`Error triggering dead hand switch for ${userAddress}:`, error);
      this.broadcastAIStatus(userAddress, `❌ Dead hand switch failed: ${error}`, 'deadhand_error');
    }
  }

  /**
   * Reset dead hand timer by scheduling a new cron job
   */
  private async resetDeadHandTimer(userAddress: string, timeoutSeconds: number): Promise<void> {
    try {
      // Cancel any existing job for this user
      const existingJob = this.cronScheduler.getJobByUserAddress(userAddress);
      if (existingJob) {
        this.cronScheduler.cancelDeadHandCheck(existingJob.id);
        console.log(`Cancelled existing job ${existingJob.id} for ${userAddress}`);
      }

      // Schedule new dead hand check
      const scheduledAt = new Date(Date.now() + timeoutSeconds * 1000);
      const jobId = this.cronScheduler.scheduleDeadHandCheck(
        userAddress,
        timeoutSeconds,
        this.handleDeadHandCheck.bind(this)
      );

      console.log(`Timer reset for ${userAddress}. New check scheduled in ${timeoutSeconds} seconds (Job ID: ${jobId})`);
      
      // Broadcast timer reset event via WebSocket
      this.broadcastTimerResetEvent(userAddress, timeoutSeconds, scheduledAt);
      
    } catch (error) {
      console.error(`Error resetting dead hand timer for ${userAddress}:`, error);
    }
  }

  /**
   * Broadcast AI status updates to all connected clients
   */
  private broadcastAIStatus(userAddress: string, message: string, statusType: string): void {
    const statusMessage = {
      type: 'ai_status_update',
      userAddress,
      data: {
        message,
        statusType,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Send to all connections
    this.connections.forEach((connection) => {
      this.sendWebSocketMessage(connection.ws, statusMessage);
    });
  }

  /**
   * Broadcast dead hand result to all connected clients
   */
  private broadcastDeadHandResult(result: DeadHandCheckResult): void {
    const message = {
      type: 'deadhand_check_result',
      userAddress: result.userAddress,
      data: {
        aiResponse: result.aiResponse,
        transactionData: result.transactionData,
        activityFound: result.activityFound
      },
      timestamp: result.timestamp
    };

    // Send to all connections
    this.connections.forEach((connection) => {
      this.sendWebSocketMessage(connection.ws, message);
    });
  }

  /**
   * Broadcast dead hand switch event to WebSocket clients
   */
  private broadcastDeadHandSwitchEvent(userAddress: string, smartAccount: string): void {
    const message = {
      type: 'deadhand_switch_triggered',
      userAddress,
      data: {
        smartAccount,
        message: 'Dead hand switch has been triggered',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Send to all WebSocket connections
    this.connections.forEach((connection) => {
      this.sendWebSocketMessage(connection.ws, message);
    });
  }

  /**
   * Broadcast timer reset event to WebSocket clients
   */
  private broadcastTimerResetEvent(userAddress: string, timeoutSeconds: number, scheduledAt: Date): void {
    const message = {
      type: 'deadhand_timer_reset',
      userAddress,
      data: {
        timeoutSeconds,
        scheduledAt: scheduledAt.toISOString(),
        message: `Timer reset for ${timeoutSeconds} seconds`
      },
      timestamp: new Date().toISOString()
    };

    // Send to all WebSocket connections
    this.connections.forEach((connection) => {
      this.sendWebSocketMessage(connection.ws, message);
    });
  }

  private getWebSocketConnectionId(ws: any): string {
    return (ws as any)._socket.remoteAddress + ':' + (ws as any)._socket.remotePort;
  }

  private sendWebSocketMessage(ws: any, message: any): void {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  private sendWebSocketError(ws: any, error: string): void {
    this.sendWebSocketMessage(ws, {
      type: 'error',
      userAddress: '',
      error,
      timestamp: new Date().toISOString(),
    });
  }

  private handleWebSocketDisconnection(ws: any): void {
    const connectionId = this.getWebSocketConnectionId(ws);
    this.connections.delete(connectionId);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Test database connection
      const dbConnected = await this.db.testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Connect MCP client
      await this.mcpClient.connect();

      // Create HTTP server
      this.server = createServer(this.app);

      // Handle WebSocket upgrade
      this.server.on('upgrade', (request: any, socket: any, head: any) => {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      });

      // Start server
      this.server.listen(this.port, () => {
        console.log(`Dead Hand Switch Server started successfully`);
        console.log(`HTTP endpoint: http://localhost:${this.port}`);
        console.log(`WebSocket endpoint: ws://localhost:${this.port}`);
        console.log('Available endpoints:');
        console.log('- POST /initiate-deadhand: Initiate dead hand check');
        console.log('- GET /health: Health check');
        console.log('- GET /jobs: Get active jobs');
        console.log('- DELETE /jobs/:jobId: Cancel a job');
      });
    } catch (error) {
      console.error('Failed to start Dead Hand Switch Server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    try {
      this.cronScheduler.cleanupAllJobs();
      this.connections.clear();
      await this.mcpClient.disconnect();
      await this.db.close();
      
      if (this.server) {
        this.server.close();
      }
      
      console.log('Dead Hand Switch Server stopped');
    } catch (error) {
      console.error('Error stopping Dead Hand Switch Server:', error);
    }
  }
}

async function main() {
  try {
    console.log('Starting Dead Hand Switch Server...');

    // Check for required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Error: OPENROUTER_API_KEY environment variable is required');
      process.exit(1);
    }

    if (!process.env.GRAPH_ACCESS_TOKEN) {
      console.warn('Warning: GRAPH_ACCESS_TOKEN environment variable not set. Some features may not work.');
    }

    // Create and start server
    const server = new DeadHandServer(3000);
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down Dead Hand Switch Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down Dead Hand Switch Server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Dead Hand Switch Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
