import dotenv from 'dotenv';

dotenv.config();
import { Graph, Ipfs, getWalletClient } from '@graphprotocol/grc-20';
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
      console.log(`✅ GRC-20 client initialized for address: ${account.address}`);
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

      // Create wallet client
      const walletClient = await getWalletClient({
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
        
        // Send transaction onchain
        const txResult = await walletClient.sendTransaction({
          // @ts-expect-error - TODO: fix the types error (matching the example)
          account: walletClient.account,
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
   * TODO: Implement querying functionality later
   */
  async getTwitterActivities(userAddress: string, hoursBack: number = 24): Promise<TwitterActivityType[]> {
    try {
      console.log(`⚠️  Query functionality not yet implemented - focusing on saving for now`);
      console.log(`📊 Would query activities for ${userAddress} (last ${hoursBack} hours)`);
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
