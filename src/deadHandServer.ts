import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { DatabaseManager } from './database.js';
import { CronScheduler } from './cronScheduler.js';
import { IgrisAIMCPClient } from './client.js';
import { twitterSyncService } from './twitterSyncService.js';
import { hypergraphClient } from './hypergraphClient.js';
import { lifiDeadHandService } from './lifiDeadHandService.js';
import { InitiateDeadHandRequest, InitiateDeadHandResponse, DeadHandCheckResult, Delegation } from './types/deadHand.js';
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

        // Get delegation from database
        const delegation = await this.db.getDelegation(userAddress);
        
        if (!delegation) {
          const response: InitiateDeadHandResponse = {
            status: 'error',
            message: 'No delegation configuration found for this user',
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
        const scheduledAt = new Date(Date.now() + delegation.timeout * 1000);
        const jobId = this.cronScheduler.scheduleDeadHandCheck(
          userAddress,
          delegation.timeout,
          this.handleDeadHandCheck.bind(this)
        );

        const response: InitiateDeadHandResponse = {
          status: 'success',
          message: 'Dead hand check initiated successfully',
          scheduledAt: scheduledAt.toISOString(),
          timeoutSeconds: delegation.timeout
        };

        console.log(`Dead hand check scheduled for ${userAddress} in ${delegation.timeout} seconds`);
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
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const { userAddress } = message;
          
          // Validate user address
          if (!userAddress || typeof userAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
            this.sendWebSocketError(ws, 'Valid user address is required');
            return;
          }
          
          // Store connection with user address
          const connectionId = this.getWebSocketConnectionId(ws);
          this.connections.set(connectionId, {
            ws,
            userAddress: userAddress.toLowerCase(),
            lastActivity: new Date(),
          });
          
          console.log(`WebSocket connected for user: ${userAddress}`);
          
          // Send connection confirmation
          this.sendWebSocketMessage(ws, {
            type: 'connection_established',
            userAddress: userAddress.toLowerCase(),
            message: 'Connected to dead hand monitoring',
            timestamp: new Date().toISOString(),
          });
          
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
    });
  }


  /**
   * Handle dead hand check when cron job triggers
   */
  private async handleDeadHandCheck(userAddress: string): Promise<void> {
    try {
      console.log(`Executing dead hand check for ${userAddress}`);
      
      // Get delegation again to ensure we have the latest data
      const delegation = await this.db.getDelegation(userAddress);
      if (!delegation) {
        console.error(`No delegation found for user ${userAddress} during dead hand check`);
        return;
      }

      // Execute dead hand check
      const result = await this.executeDeadHandCheck(userAddress, delegation.timeout);
      
      console.log(`Dead hand check completed for ${userAddress}. Activity found: ${result.activityFound}`);
      console.log(`Beneficiary address: ${delegation.beneficiaryAddress}`);
      console.log(`Smart account (kernel client): ${delegation.kernelClient}`);
      
      if (!result.activityFound) {
        // No activity found - trigger dead hand switch
        console.log(`No activity found for ${userAddress}. Triggering dead hand switch.`);
        await this.triggerDeadHandSwitch(userAddress, delegation.beneficiaryAddress, delegation.kernelClient);
      } else {
        // Activity found - reset the timer
        console.log(`Activity found for ${userAddress}. Resetting timer for ${delegation.timeout} seconds.`);
        await this.resetDeadHandTimer(userAddress, delegation.timeout);
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
      
      // Perform complete Twitter sync (fetch from API + sync to Hypergraph)
      const activities = await twitterSyncService.performCompleteSync(twitterAuth, 24); // Last 24 hours
      
      console.log(`Twitter sync completed for ${userAddress}: ${activities.length} activities synced to Hypergraph`);
      
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
      const prompt = `Check for ALL token transfers (both received and sent) for wallet address ${userAddress} on polygon in the last ${timeoutSeconds} seconds. Include both ERC-20 tokens and native transfers. Provide a detailed analysis of any activity found.`;
      
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
      console.log(`Checking Twitter activity from Hypergraph for ${userAddress} (last ${timeoutSeconds}s)`);
      
      // Convert timeout seconds to hours for the query
      const hoursBack = Math.ceil(timeoutSeconds / 3600); // Round up to nearest hour
      
      // Query Hypergraph for recent Twitter activities
      const hasActivity = await hypergraphClient.hasRecentTwitterActivity(userAddress, hoursBack);
      
      console.log(`Twitter activity check result for ${userAddress}: ${hasActivity ? 'ACTIVE' : 'NO ACTIVITY'}`);
      return hasActivity;
      
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
   * Trigger dead hand switch using LiFi to bridge all tokens to USDC
   */
  private async triggerDeadHandSwitch(userAddress: string, beneficiaryAddress: string, kernelClient: string): Promise<void> {
    try {
      console.log(`🚨 DEAD HAND SWITCH TRIGGERED for ${userAddress}`);
      console.log(`Beneficiary Address: ${beneficiaryAddress}`);
      console.log(`Smart Account (Kernel Client): ${kernelClient}`);
      
      // Broadcast dead hand switch initiation
      this.broadcastAIStatus(userAddress, '🚨 DEAD HAND SWITCH INITIATED', 'deadhand_initiated');
      this.broadcastAIStatus(userAddress, `Beneficiary Address: ${beneficiaryAddress}`, 'beneficiary_address');
      // this.broadcastAIStatus(userAddress, `Smart Account: ${kernelClient}`, 'smart_account');
      
      // Step 1: Analyze wallet balances
      this.broadcastAIStatus(userAddress, 'Step 1: Analyzing wallet token balances...', 'deadhand_step');
      const tokenBalances = await this.getUserTokenBalances(userAddress);
      
      if (tokenBalances.length === 0) {
        this.broadcastAIStatus(userAddress, 'No tokens found to bridge', 'deadhand_step');
        this.broadcastAIStatus(userAddress, '✅ Dead hand switch completed - no action needed', 'deadhand_completed');
        return;
      }
      
      this.broadcastAIStatus(userAddress, `Found ${tokenBalances.length} tokens to bridge to ETH`, 'deadhand_step');
      
      // Step 2: Execute LiFi bridge transactions
      this.broadcastAIStatus(userAddress, 'Step 2: Executing LiFi bridge transactions...', 'deadhand_step');
      
      const results = await lifiDeadHandService.executeDeadHandSwitch(
        userAddress,
        beneficiaryAddress,
        kernelClient,
        tokenBalances
      );
      
      // Check if result requires user action (new format) or is completed (old format)
      if ('requiresUserAction' in results) {
        // New format: Return transactions for user to sign
        this.broadcastAIStatus(userAddress, 
          `Step 3: ${results.message}`, 
          'deadhand_step'
        );
        
        this.broadcastAIStatus(userAddress, 
          `📝 ${results.transactions.length} transactions prepared for signing`, 
          'deadhand_user_action_required'
        );
        
        console.log(`Dead hand switch prepared ${results.transactions.length} transactions for user ${userAddress}`);
        console.log(`Transactions require user signature and execution`);
        
        // Broadcast the transaction data to the user
        this.broadcastTransactionData(userAddress, {
          type: 'transactions_prepared',
          message: results.message,
          transactions: results.transactions,
          requiresUserAction: true,
          chainId: results.chainId,
          chainName: results.chainName,
          rpcUrl: results.rpcUrl
        });
        
      } else {
        // Old format: Transactions were executed automatically
        const successfulTransfers = results.filter(r => r.success).length;
        const totalTransfers = results.length;
        
        this.broadcastAIStatus(userAddress, 
          `Step 3: Bridge completed - ${successfulTransfers}/${totalTransfers} tokens bridged successfully`, 
          'deadhand_step'
        );
        
        if (successfulTransfers === totalTransfers) {
          this.broadcastAIStatus(userAddress, '✅ Dead hand switch completed successfully', 'deadhand_completed');
        } else {
          this.broadcastAIStatus(userAddress, `⚠️ Dead hand switch completed with ${totalTransfers - successfulTransfers} failures`, 'deadhand_completed');
        }
        
        console.log(`Dead hand switch executed for user ${userAddress} with beneficiary address ${beneficiaryAddress}`);
        console.log(`Smart account (kernel client): ${kernelClient}`);
        console.log(`Bridge results: ${successfulTransfers}/${totalTransfers} successful`);
      }
      
    } catch (error) {
      console.error(`Error triggering dead hand switch for ${userAddress}:`, error);
      this.broadcastAIStatus(userAddress, `❌ Dead hand switch failed: ${error}`, 'deadhand_error');
    }
  }

  /**
   * Get user's token balances using The Graph Token API
   */
  private async getUserTokenBalances(userAddress: string): Promise<Array<{ token: any; balance: string; chainId: number }>> {
    try {
      console.log(`Getting token balances for ${userAddress}`);
      
      this.broadcastAIStatus(userAddress, 'Fetching token balances from Polygon and Arbitrum...', 'deadhand_step');
      
      // Use LiFi service to fetch token balances
      const tokenBalances = await lifiDeadHandService.fetchTokenBalances(userAddress);
      
      this.broadcastAIStatus(userAddress, `Found ${tokenBalances.length} tokens with balances`, 'deadhand_step');
      
      // Log token details for debugging
      tokenBalances.forEach(({ token, balance, chainId }) => {
        console.log(`Token: ${token.tokenId} | Balance: ${balance} | Chain: ${chainId}`);
      });
      
      return tokenBalances;
      
    } catch (error) {
      console.error(`Error getting token balances for ${userAddress}:`, error);
      this.broadcastAIStatus(userAddress, `Error fetching token balances: ${error}`, 'deadhand_step');
      return [];
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
   * Broadcast AI status updates to specific user
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

    // Send only to connections for this specific user
    this.connections.forEach((connection) => {
      if (connection.userAddress === userAddress.toLowerCase()) {
        this.sendWebSocketMessage(connection.ws, statusMessage);
      }
    });
  }

  /**
   * Broadcast dead hand result to specific user
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

    // Send only to connections for this specific user
    this.connections.forEach((connection) => {
      if (connection.userAddress === result.userAddress.toLowerCase()) {
        this.sendWebSocketMessage(connection.ws, message);
      }
    });
  }

  /**
   * Broadcast dead hand switch event to specific user
   */
  private broadcastDeadHandSwitchEvent(userAddress: string, beneficiaryAddress: string, kernelClient: string, results?: any[]): void {
    const message = {
      type: 'deadhand_switch_triggered',
      userAddress,
      data: {
        beneficiaryAddress,
        smartAccount: kernelClient,
        message: 'Dead hand switch has been triggered',
        results: results || [],
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Send only to connections for this specific user
    this.connections.forEach((connection) => {
      if (connection.userAddress === userAddress.toLowerCase()) {
        this.sendWebSocketMessage(connection.ws, message);
      }
    });
  }

  /**
   * Broadcast transaction data to specific user for signing
   */
  private broadcastTransactionData(userAddress: string, transactionData: any): void {
    const message = {
      ...transactionData,
      userAddress,
      timestamp: new Date().toISOString()
    };

    // Send only to connections for this specific user
    this.connections.forEach((connection) => {
      if (connection.userAddress === userAddress.toLowerCase()) {
        this.sendWebSocketMessage(connection.ws, message);
      }
    });
  }

  /**
   * Broadcast timer reset event to specific user
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

    // Send only to connections for this specific user
    this.connections.forEach((connection) => {
      if (connection.userAddress === userAddress.toLowerCase()) {
        this.sendWebSocketMessage(connection.ws, message);
      }
    });
  }

  private getWebSocketConnectionId(ws: any): string {
    return (ws as any)._socket.remoteAddress + ':' + (ws as any)._socket.remotePort;
  }

  private sendWebSocketMessage(ws: any, message: any): void {
    if (ws.readyState === 1) { // WebSocket.OPEN
      // Convert BigInt values to strings for JSON serialization
      const serializedMessage = this.serializeBigInts(message);
      ws.send(JSON.stringify(serializedMessage));
    }
  }

  /**
   * Recursively convert BigInt values to strings for JSON serialization
   */
  private serializeBigInts(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigInts(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.serializeBigInts(value);
      }
      return result;
    }
    
    return obj;
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
