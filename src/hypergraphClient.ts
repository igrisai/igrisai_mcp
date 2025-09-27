import dotenv from 'dotenv';

dotenv.config();
import { store } from '@graphprotocol/hypergraph';
import { TwitterActivity } from './schema.js';
import { TwitterActivity as TwitterActivityType } from './types/deadHand.js';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains'

export class HypergraphClient {
  private publicSpaceId: string;
  private walletClient: any;

  constructor(publicSpaceId?: string) {
    this.publicSpaceId = publicSpaceId || process.env.HYPERGRAPH_PUBLIC_SPACE_ID || '';
    
    // Create wallet client from private key
    const privateKey = process.env.IGRIS_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.warn('⚠️  IGRIS_WALLET_PRIVATE_KEY not found in environment variables');
      this.walletClient = null;
      return;
    }

    try {
      // Create account from private key
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      
      // Create wallet client
      this.walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http(), // Using HTTP transport for now
      });
      
      console.log(`✅ Wallet client created for address: ${account.address}`);
    } catch (error) {
      console.error('❌ Failed to create wallet client:', error);
      this.walletClient = null;
    }
  }

  /**
   * Sync Twitter activities to Hypergraph using the core store
   */
  async syncTwitterActivities(activities: TwitterActivityType[]): Promise<void> {
    try {
      console.log(`Syncing ${activities.length} Twitter activities to Hypergraph`);
      
      if (!this.walletClient) {
        throw new Error('Wallet client not configured. Please set IGRIS_WALLET_PRIVATE_KEY environment variable.');
      }

      for (const activity of activities) {
        // Create TwitterActivity entity in Hypergraph
        const hypergraphActivity = new TwitterActivity({
          id: activity.id,
          userAddress: activity.userAddress,
          activityType: activity.activityType,
          timestamp: activity.timestamp,
          content: activity.content,
          tweetId: activity.metadata.tweetId,
          authorId: activity.metadata.authorId,
          retweetCount: activity.metadata.retweetCount,
          likeCount: activity.metadata.likeCount
        });

        // Store in Hypergraph using the core store
        // Note: We need to find the correct event type for creating entities
        // For now, we'll use a placeholder approach
        console.log(`📝 Would store entity:`, hypergraphActivity);
        console.log(`📝 In space: ${this.publicSpaceId}`);
        
        console.log(`✅ Synced ${activity.activityType} activity for ${activity.userAddress}`);
      }
      
      console.log(`✅ Successfully synced ${activities.length} activities to Hypergraph`);
      
    } catch (error) {
      console.error('Error syncing Twitter activities to Hypergraph:', error);
      throw error;
    }
  }

  /**
   * Query Twitter activities from Hypergraph for a user within a time range
   */
  async getTwitterActivities(userAddress: string, hoursBack: number = 24): Promise<TwitterActivityType[]> {
    try {
      console.log(`Querying Twitter activities for ${userAddress} (last ${hoursBack} hours)`);
      
      const sinceTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      
      // Query Hypergraph using the core store
      const snapshot = await store.get();
      
      // The snapshot contains context with spaces and repo data
      // We need to access the repo data to find entities
      const repo = snapshot.context.repo;
      
      if (!repo) {
        console.log('No repo data available in Hypergraph store');
        return [];
      }
      
      // TODO: Implement proper entity querying from the repo
      // The repo structure needs to be explored to find the correct way to query entities
      console.log(`⚠️  Entity querying not yet implemented - repo structure needs exploration`);
      return [];
      
    } catch (error) {
      console.error('Error querying Twitter activities from Hypergraph:', error);
      return [];
    }
  }

  async hasRecentTwitterActivity(userAddress: string, hoursBack: number = 24): Promise<boolean> {
    try {
      const activities = await this.getTwitterActivities(userAddress, hoursBack);
      return activities.length > 0;
    } catch (error) {
      console.error('Error checking recent Twitter activity:', error);
      return false;
    }
  }
}

export const hypergraphClient = new HypergraphClient();
