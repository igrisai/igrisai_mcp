import { TwitterApi } from 'twitter-api-v2';
import { TwitterAuth, TwitterActivity } from './types/deadHand.js';
import { hypergraphClient } from './hypergraphClient.js';

export class TwitterSyncService {
  /**
   * Fetch Twitter activities for a user using OAuth credentials
   */
  async fetchTwitterActivities(twitterAuth: TwitterAuth, hoursBack: number = 24): Promise<TwitterActivity[]> {
    try {
      // Initialize Twitter API client
      const twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_SECRET!,
        accessToken: twitterAuth.accessToken,
        accessSecret: twitterAuth.refreshToken || '',
      });

      const sinceTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      const activities: TwitterActivity[] = [];

      // Fetch user's tweets
      try {
        const tweets = await twitterClient.v2.userTimeline(twitterAuth.twitterUserId, {
          'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
          'max_results': 100,
        });

        for (const tweet of tweets.data?.data || []) {
          const tweetTime = new Date(tweet.created_at!);
          if (tweetTime >= sinceTime) {
            activities.push({
              id: tweet.id,
              userAddress: twitterAuth.userAddress,
              activityType: 'tweet',
              timestamp: tweetTime,
              content: tweet.text,
              metadata: {
                tweetId: tweet.id,
                authorId: tweet.author_id!,
                retweetCount: tweet.public_metrics?.retweet_count || 0,
                likeCount: tweet.public_metrics?.like_count || 0,
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching tweets for ${twitterAuth.userAddress}:`, error);
      }

      // Fetch user's likes
      try {
        const likes = await twitterClient.v2.userLikedTweets(twitterAuth.twitterUserId, {
          'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
          'max_results': 100,
        });

        for (const like of likes.data?.data || []) {
          const likeTime = new Date(like.created_at!);
          if (likeTime >= sinceTime) {
            activities.push({
              id: `like_${like.id}`,
              userAddress: twitterAuth.userAddress,
              activityType: 'like',
              timestamp: likeTime,
              content: like.text,
              metadata: {
                tweetId: like.id,
                authorId: like.author_id!,
                retweetCount: like.public_metrics?.retweet_count || 0,
                likeCount: like.public_metrics?.like_count || 0,
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching likes for ${twitterAuth.userAddress}:`, error);
      }

      // Fetch user's retweets (using mentions endpoint as a proxy)
      try {
        const mentions = await twitterClient.v2.userMentionTimeline(twitterAuth.twitterUserId, {
          'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'referenced_tweets'],
          'max_results': 100,
        });

        for (const mention of mentions.data?.data || []) {
          const mentionTime = new Date(mention.created_at!);
          if (mentionTime >= sinceTime) {
            // Check if this is a retweet
            const isRetweet = mention.referenced_tweets?.some(ref => ref.type === 'retweeted');
            
            if (isRetweet) {
              activities.push({
                id: `retweet_${mention.id}`,
                userAddress: twitterAuth.userAddress,
                activityType: 'retweet',
                timestamp: mentionTime,
                content: mention.text,
                metadata: {
                  tweetId: mention.id,
                  authorId: mention.author_id!,
                  retweetCount: mention.public_metrics?.retweet_count || 0,
                  likeCount: mention.public_metrics?.like_count || 0,
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching retweets for ${twitterAuth.userAddress}:`, error);
      }

      console.log(`Fetched ${activities.length} Twitter activities for ${twitterAuth.userAddress}`);
      return activities;

    } catch (error) {
      console.error(`Error fetching Twitter activities for ${twitterAuth.userAddress}:`, error);
      return [];
    }
  }

  /**
   * Sync Twitter activities to Hypergraph
   */
  async syncToHypergraph(userAddress: string, activities: TwitterActivity[]): Promise<void> {
    try {
      console.log(`Syncing ${activities.length} Twitter activities to Hypergraph for ${userAddress}`);
      
      if (activities.length === 0) {
        console.log('No activities to sync');
        return;
      }
      
      // Use Hypergraph client to sync activities
      await hypergraphClient.syncTwitterActivities(activities);
      
      console.log(`✅ Successfully synced ${activities.length} activities to Hypergraph for ${userAddress}`);
      
    } catch (error) {
      console.error(`Error syncing to Hypergraph for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Main sync function that fetches and syncs Twitter activities
   */
  async syncTwitterActivities(userAddress: string, hoursBack: number = 24): Promise<TwitterActivity[]> {
    try {
      // This will be called from the database manager
      // For now, return empty array as we'll integrate this properly
      console.log(`Starting Twitter sync for ${userAddress} (last ${hoursBack} hours)`);
      
      // TODO: Get Twitter auth from database and fetch activities
      // const twitterAuth = await db.getTwitterAuth(userAddress);
      // if (!twitterAuth) {
      //   console.log(`No Twitter auth found for ${userAddress}`);
      //   return [];
      // }
      
      // const activities = await this.fetchTwitterActivities(twitterAuth, hoursBack);
      // await this.syncToHypergraph(userAddress, activities);
      
      return [];
      
    } catch (error) {
      console.error(`Twitter sync failed for ${userAddress}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const twitterSyncService = new TwitterSyncService();
