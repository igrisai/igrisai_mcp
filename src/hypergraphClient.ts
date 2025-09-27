import dotenv from 'dotenv';

dotenv.config();
import { Graph, Ipfs, getSmartAccountWalletClient } from '@graphprotocol/grc-20';
import { TwitterActivity as TwitterActivityType } from './types/deadHand.js';
import { privateKeyToAccount } from 'viem/accounts';

export class HypergraphClient {
  private publicSpaceId: string;
  private privateKey: string;

  constructor(publicSpaceId?: string) {
    this.publicSpaceId = publicSpaceId || process.env.HYPERGRAPH_PUBLIC_SPACE_ID || '';
    this.privateKey = process.env.IGRIS_WALLET_PRIVATE_KEY || '';
    
    if (!this.privateKey) {
      console.warn('⚠️  IGRIS_WALLET_PRIVATE_KEY not found in environment variables');
    } else {
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      console.log(`✅ GRC-20 Geo Account client initialized for address: ${account.address}`);
    }
  }

  /**
   * Sync Twitter activities to Hypergraph using GRC-20 SDK
   */
  async syncTwitterActivities(activities: TwitterActivityType[]): Promise<void> {
    try {
      console.log(`Syncing ${activities.length} Twitter activities to Hypergraph using GRC-20 SDK`);
      
      if (!this.privateKey) {
        throw new Error('Private key not configured. Please set IGRIS_WALLET_PRIVATE_KEY environment variable.');
      }

      if (!this.publicSpaceId) {
        throw new Error('Public space ID not configured. Please set HYPERGRAPH_PUBLIC_SPACE_ID environment variable.');
      }

      // Create smart account wallet client for Geo account
      const smartAccountWalletClient = await getSmartAccountWalletClient({
        privateKey: this.privateKey as `0x${string}`,
      });

      // Collect all operations
      const allOps: any[] = [];
      
      for (const activity of activities) {
        // Create entity using GRC-20 SDK
        const { ops } = Graph.createEntity({
          name: `${activity.activityType} - ${activity.userAddress}`,
          description: activity.content,
          // We can add custom properties here if needed
        });
        
        allOps.push(...ops);
        console.log(`✅ Prepared ${activity.activityType} activity for ${activity.userAddress}`);
      }
      
      if (allOps.length > 0) {
        // Get the author address from the account we created earlier
        const account = privateKeyToAccount(this.privateKey as `0x${string}`);
        const authorAddress = account.address;
        
        // Publish edit to IPFS
        const { cid } = await Ipfs.publishEdit({
          name: `Twitter Activities Sync - ${new Date().toISOString()}`,
          ops: allOps,
          author: authorAddress,
        });
        
        console.log(`✅ Published edit to IPFS with CID: ${cid}`);
        
        // Get calldata for onchain transaction
        const result = await fetch(`${Graph.TESTNET_API_ORIGIN}/space/${this.publicSpaceId}/edit/calldata`, {
          method: 'POST',
          body: JSON.stringify({ cid }),
        });
        
        const { to, data } = await result.json();
        
        // Send transaction onchain using smart account
        const txResult = await smartAccountWalletClient.sendTransaction({
          to: to,
          value: 0n,
          data: data,
        });
        
        console.log(`✅ Published ${activities.length} activities to Hypergraph onchain. Transaction: ${txResult}`);
      }
      
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
      console.log(`🔍 Querying activities for ${userAddress} (last ${hoursBack} hours)`);
      
      if (!this.publicSpaceId) {
        throw new Error('Public space ID not configured');
      }

      // Query the Hypergraph space for entities
      // Note: This is a simplified approach - in production you'd want more sophisticated filtering
      const queryUrl = `${Graph.TESTNET_API_ORIGIN}/space/${this.publicSpaceId}/entities`;
      
      console.log(`📡 Querying: ${queryUrl}`);
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Query failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Raw query response:`, JSON.stringify(data, null, 2));
      
      // Parse the response and filter for Twitter activities
      // This is where we'd need to implement proper filtering based on the actual response format
      const activities: TwitterActivityType[] = [];
      
      if (data.entities && Array.isArray(data.entities)) {
        for (const entity of data.entities) {
          // Check if this entity is a Twitter activity
          if (entity.name && entity.name.includes('tweet') || entity.name.includes('like') || entity.name.includes('retweet')) {
            // Convert entity back to TwitterActivity format
            const activity: TwitterActivityType = {
              id: entity.id || `activity_${Date.now()}`,
              userAddress: this.extractUserAddressFromEntity(entity) || userAddress,
              activityType: this.extractActivityTypeFromEntity(entity),
              timestamp: new Date(entity.createdAt || Date.now()),
              content: entity.description || entity.name || 'Unknown content',
              metadata: {
                tweetId: entity.id || '',
                authorId: this.extractUserAddressFromEntity(entity) || userAddress,
                retweetCount: 0,
                likeCount: 0
              }
            };
            activities.push(activity);
          }
        }
      }
      
      console.log(`✅ Found ${activities.length} Twitter activities`);
      return activities;
      
    } catch (error) {
      console.error('Error querying Twitter activities from Hypergraph:', error);
      return [];
    }
  }

  /**
   * Extract user address from entity data
   */
  private extractUserAddressFromEntity(entity: any): string | null {
    // Try to extract user address from entity name or description
    if (entity.name && entity.name.includes('0x')) {
      const match = entity.name.match(/0x[a-fA-F0-9]{40}/);
      return match ? match[0] : null;
    }
    return null;
  }

  /**
   * Extract activity type from entity data
   */
  private extractActivityTypeFromEntity(entity: any): 'tweet' | 'like' | 'retweet' | 'reply' {
    if (entity.name) {
      const name = entity.name.toLowerCase();
      if (name.includes('like')) return 'like';
      if (name.includes('retweet')) return 'retweet';
      if (name.includes('reply')) return 'reply';
    }
    return 'tweet'; // Default
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
