import { store, TwitterActivity, DeadHandConfig } from '@graphprotocol/hypergraph';
import { TwitterActivity as TwitterActivityType } from './types/deadHand.js';

export class HypergraphClient {
  private store: any;

  constructor() {
    // Initialize Hypergraph store
    // Note: In a real implementation, you would need to configure the store with your space credentials
    this.store = store;
  }

  /**
   * Sync Twitter activities to Hypergraph
   */
  async syncTwitterActivities(activities: TwitterActivityType[]): Promise<void> {
    try {
      console.log(`Syncing ${activities.length} Twitter activities to Hypergraph`);
      
      for (const activity of activities) {
        // Create TwitterActivity entity in Hypergraph
        const hypergraphActivity = new TwitterActivity({
          userAddress: activity.userAddress,
          activityType: activity.activityType,
          timestamp: activity.timestamp,
          content: activity.content,
          tweetId: activity.metadata.tweetId,
          authorId: activity.metadata.authorId,
          retweetCount: activity.metadata.retweetCount,
          likeCount: activity.metadata.likeCount,
        });

        // Store in Hypergraph
        await this.store.create(hypergraphActivity);
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
      
      // Query Hypergraph for Twitter activities
      const activities = await this.store.query({
        entity: TwitterActivity,
        filter: {
          userAddress: userAddress,
          timestamp: { $gte: sinceTime }
        }
      });

      // Convert Hypergraph entities back to our type
      const twitterActivities: TwitterActivityType[] = activities.map((activity: any) => ({
        id: activity.tweetId,
        userAddress: activity.userAddress,
        activityType: activity.activityType,
        timestamp: activity.timestamp,
        content: activity.content,
        metadata: {
          tweetId: activity.tweetId,
          authorId: activity.authorId,
          retweetCount: activity.retweetCount,
          likeCount: activity.likeCount,
        }
      }));

      console.log(`Found ${twitterActivities.length} Twitter activities for ${userAddress}`);
      return twitterActivities;
      
    } catch (error) {
      console.error('Error querying Twitter activities from Hypergraph:', error);
      return [];
    }
  }

  /**
   * Check if user has recent Twitter activity
   */
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

// Export singleton instance
export const hypergraphClient = new HypergraphClient();
