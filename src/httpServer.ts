import express from 'express';
import { DatabaseManager } from './database.js';
import { CronScheduler } from './cronScheduler.js';
import { TokenActivityWebSocketServer } from './websocketServer.js';
import { InitiateDeadHandRequest, InitiateDeadHandResponse } from './types/deadHand.js';
import dotenv from 'dotenv';

dotenv.config();

export class HttpServer {
  private app: express.Application;
  private db: DatabaseManager;
  private cronScheduler: CronScheduler;
  private wsServer: TokenActivityWebSocketServer;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.db = new DatabaseManager();
    this.cronScheduler = new CronScheduler();
    this.wsServer = new TokenActivityWebSocketServer(8080);
    
    this.setupMiddleware();
    this.setupRoutes();
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
    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
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

      // Execute dead hand check via WebSocket server
      const result = await this.wsServer.executeDeadHandCheck(userAddress, config.timeoutSeconds);
      
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
   * Trigger dead hand switch (placeholder for future implementation)
   */
  private async triggerDeadHandSwitch(userAddress: string, smartAccount: string): Promise<void> {
    try {
      console.log(`🚨 DEAD HAND SWITCH TRIGGERED for ${userAddress}`);
      console.log(`Smart Account: ${smartAccount}`);
      
      // TODO: Implement actual dead hand switch logic
      // This could include:
      // - Transfer funds to a safe address
      // - Execute smart contract functions
      // - Send notifications
      // - Log the event
      
      // For now, just log the event
      console.log(`Dead hand switch executed for user ${userAddress} with smart account ${smartAccount}`);
      
      // Broadcast dead hand switch event via WebSocket
      this.broadcastDeadHandSwitchEvent(userAddress, smartAccount);
      
    } catch (error) {
      console.error(`Error triggering dead hand switch for ${userAddress}:`, error);
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
    this.wsServer['connections'].forEach((connection) => {
      if (connection.ws.readyState === 1) { // WebSocket.OPEN
        connection.ws.send(JSON.stringify(message));
      }
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
    this.wsServer['connections'].forEach((connection) => {
      if (connection.ws.readyState === 1) { // WebSocket.OPEN
        connection.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    try {
      // Test database connection
      const dbConnected = await this.db.testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Start WebSocket server
      await this.wsServer.start();

      this.app.listen(this.port, () => {
        console.log(`HTTP server started on port ${this.port}`);
        console.log(`WebSocket server started on port 8080`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        console.log(`Initiate dead hand: POST http://localhost:${this.port}/initiate-deadhand`);
      });
    } catch (error) {
      console.error('Failed to start HTTP server:', error);
      throw error;
    }
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    try {
      this.cronScheduler.cleanupAllJobs();
      await this.wsServer.stop();
      await this.db.close();
      console.log('HTTP server stopped');
    } catch (error) {
      console.error('Error stopping HTTP server:', error);
    }
  }
}
