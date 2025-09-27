import { Pool, PoolClient } from 'pg';
import { DatabaseConfig, DeadHandConfig, TwitterAuth } from './types/deadHand.js';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseManager {
  private pool: Pool;
  private config?: DatabaseConfig;

  constructor() {
    // Use DATABASE_URL if available, otherwise fall back to individual config
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
    } else {
      this.config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'deadhand_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true'
      };

      this.pool = new Pool(this.config);
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      console.log('Database connection established');
    });
  }

  /**
   * Get dead hand config for a user address with retry logic
   */
  async getDeadHandConfig(userAddress: string): Promise<DeadHandConfig | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          const query = `
            SELECT id, user_address, smart_account, timeout_seconds, is_active, created_at, updated_at
            FROM dead_hand_configs 
            WHERE user_address = $1 AND is_active = true
          `;
          
          const result = await client.query(query, [userAddress.toLowerCase()]);
          
          if (result.rows.length === 0) {
            return null;
          }

          const row = result.rows[0];
          return {
            id: row.id,
            userAddress: row.user_address,
            smartAccount: row.smart_account,
            timeoutSeconds: row.timeout_seconds,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Database query attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`Retrying database connection in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Database query failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Create a new dead hand config
   */
  async createDeadHandConfig(config: Omit<DeadHandConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeadHandConfig> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          const query = `
            INSERT INTO dead_hand_configs (user_address, smart_account, timeout_seconds, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_address, smart_account, timeout_seconds, is_active, created_at, updated_at
          `;
          
          const result = await client.query(query, [
            config.userAddress.toLowerCase(),
            config.smartAccount.toLowerCase(),
            config.timeoutSeconds,
            config.isActive
          ]);

          const row = result.rows[0];
          return {
            id: row.id,
            userAddress: row.user_address,
            smartAccount: row.smart_account,
            timeoutSeconds: row.timeout_seconds,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Database insert attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`Retrying database connection in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Database insert failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Update dead hand config
   */
  async updateDeadHandConfig(userAddress: string, updates: Partial<DeadHandConfig>): Promise<DeadHandConfig | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          const setClause = [];
          const values = [];
          let paramIndex = 1;

          if (updates.smartAccount !== undefined) {
            setClause.push(`smart_account = $${paramIndex++}`);
            values.push(updates.smartAccount.toLowerCase());
          }
          if (updates.timeoutSeconds !== undefined) {
            setClause.push(`timeout_seconds = $${paramIndex++}`);
            values.push(updates.timeoutSeconds);
          }
          if (updates.isActive !== undefined) {
            setClause.push(`is_active = $${paramIndex++}`);
            values.push(updates.isActive);
          }

          setClause.push(`updated_at = CURRENT_TIMESTAMP`);
          values.push(userAddress.toLowerCase());

          const query = `
            UPDATE dead_hand_configs 
            SET ${setClause.join(', ')}
            WHERE user_address = $${paramIndex}
            RETURNING id, user_address, smart_account, timeout_seconds, is_active, created_at, updated_at
          `;
          
          const result = await client.query(query, values);

          if (result.rows.length === 0) {
            return null;
          }

          const row = result.rows[0];
          return {
            id: row.id,
            userAddress: row.user_address,
            smartAccount: row.smart_account,
            timeoutSeconds: row.timeout_seconds,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Database update attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`Retrying database connection in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Database update failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Twitter OAuth credentials for a user
   */
  async getTwitterAuth(userAddress: string): Promise<TwitterAuth | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          const query = `
            SELECT id, user_address, twitter_user_id, access_token, refresh_token, 
                   twitter_user_name, expires_at, created_at, updated_at
            FROM twitter_auth 
            WHERE LOWER(user_address) = LOWER($1) AND expires_at > NOW()
          `;
          
          const result = await client.query(query, [userAddress]);
          
          if (result.rows.length === 0) {
            return null;
          }

          const row = result.rows[0];
          return {
            id: row.id,
            userAddress: row.user_address,
            twitterUserId: row.twitter_user_id,
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            twitterUserName: row.twitter_user_name,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Twitter auth query attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`Retrying Twitter auth query in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Twitter auth query failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}
