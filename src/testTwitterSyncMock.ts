import { TwitterSyncService } from './twitterSyncService.js';
import { HypergraphClient } from './hypergraphClient.js';
import { DatabaseManager } from './database.js';
import { TwitterAuth, TwitterActivity } from './types/deadHand.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class TwitterSyncMockTest {
  private twitterSyncService: TwitterSyncService;
  private hypergraphClient: HypergraphClient;
  private db: DatabaseManager;
  private testUserAddress: string;

  constructor(userAddress: string) {
    this.testUserAddress = userAddress;
    this.twitterSyncService = new TwitterSyncService();
    this.hypergraphClient = new HypergraphClient();
    this.db = new DatabaseManager();
  }

  /**
   * Generate mock Twitter activities for testing
   */
  private generateMockTwitterActivities(count: number = 5): TwitterActivity[] {
    const activities: TwitterActivity[] = [];
    const now = new Date();
    
    const mockTweets = [
      "Just deployed a new feature to our dead hand switch system! 🚀",
      "Working on Hypergraph integration for Twitter activity monitoring 📊",
      "Testing the MCP client with Graph protocol data 🔗",
      "Dead hand switch is looking solid! Great progress today 💪",
      "Integrating AI with blockchain data for automated monitoring 🤖"
    ];

    const mockLikes = [
      "Love this approach to decentralized monitoring!",
      "Great work on the Hypergraph integration!",
      "This dead hand switch concept is brilliant 🔥",
      "Amazing progress on the MCP client!",
      "The AI integration looks promising 🤖"
    ];

    const activityTypes = ['tweet', 'like', 'retweet'] as const;

    for (let i = 0; i < count; i++) {
      const activityType = activityTypes[i % activityTypes.length];
      const timestamp = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // 2 hours apart
      
      let content = '';
      if (activityType === 'tweet') {
        content = mockTweets[i % mockTweets.length];
      } else if (activityType === 'like') {
        content = mockLikes[i % mockLikes.length];
      } else {
        content = `RT: ${mockTweets[i % mockTweets.length]}`;
      }

      activities.push({
        id: `mock_${activityType}_${i + 1}`,
        userAddress: this.testUserAddress,
        activityType,
        timestamp,
        content,
        metadata: {
          tweetId: `tweet_${i + 1}`,
          authorId: '1687376691063377920',
          retweetCount: Math.floor(Math.random() * 100),
          likeCount: Math.floor(Math.random() * 500),
        }
      });
    }

    return activities;
  }

  /**
   * Create mock Twitter auth for testing
   */
  private createMockTwitterAuth(): TwitterAuth {
    return {
      id: 1,
      userAddress: this.testUserAddress,
      twitterUserId: '1687376691063377920',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      twitterUserName: 'VijayAnkit1993',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Run the mock Twitter sync test for 30 seconds
   */
  async runMockTest(): Promise<void> {
    console.log('🚀 Starting Mock Twitter Sync Test...');
    console.log(`📧 Test User Address: ${this.testUserAddress}`);
    console.log('⏱️  Test Duration: 30 seconds');
    console.log('🎭 Using Mock Data (No Twitter API calls)');
    console.log('─'.repeat(60));

    try {
      // 1. Test database connection
      console.log('1️⃣ Testing database connection...');
      await this.db.testConnection();
      console.log('✅ Database connection successful');

      // 2. Create mock Twitter auth
      console.log('2️⃣ Creating mock Twitter auth...');
      const mockTwitterAuth = this.createMockTwitterAuth();
      console.log('✅ Mock Twitter auth created:', {
        twitterUserId: mockTwitterAuth.twitterUserId,
        twitterUserName: mockTwitterAuth.twitterUserName,
        expiresAt: mockTwitterAuth.expiresAt
      });

      // 3. Generate mock activities
      console.log('3️⃣ Generating mock Twitter activities...');
      const mockActivities = this.generateMockTwitterActivities(8);
      console.log(`✅ Generated ${mockActivities.length} mock activities:`);
      mockActivities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.activityType} - ${activity.content.substring(0, 50)}...`);
      });

      // 4. Test Hypergraph sync with mock data
      console.log('4️⃣ Testing Hypergraph sync with mock data...');
      await this.hypergraphClient.syncTwitterActivities(mockActivities);
      console.log(`✅ Successfully synced ${mockActivities.length} mock activities to Hypergraph`);

      // 5. Test Hypergraph query
      console.log('5️⃣ Testing Hypergraph query...');
      const hasRecentActivity = await this.hypergraphClient.hasRecentTwitterActivity(this.testUserAddress, 24);
      console.log(`✅ Hypergraph query successful - Recent activity: ${hasRecentActivity ? 'YES' : 'NO'}`);

      // 6. Continuous sync test for 30 seconds
      console.log('6️⃣ Starting continuous mock sync test for 30 seconds...');
      let syncCount = 0;
      const startTime = Date.now();
      const testDuration = 30000; // 30 seconds

      while (Date.now() - startTime < testDuration) {
        try {
          console.log(`\n🔄 Mock sync attempt ${++syncCount}...`);
          
          // Generate new mock activities each time
          const newMockActivities = this.generateMockTwitterActivities(3);
          console.log(`📊 Generated ${newMockActivities.length} new mock activities`);
          
          // Sync to Hypergraph
          await this.hypergraphClient.syncTwitterActivities(newMockActivities);
          console.log(`✅ Synced ${newMockActivities.length} mock activities to Hypergraph`);
          
          // Test query
          const queryResult = await this.hypergraphClient.getTwitterActivities(this.testUserAddress, 24);
          console.log(`🔍 Query result: ${queryResult.length} total activities found in Hypergraph`);
          
          // Show some activity details
          if (queryResult.length > 0) {
            const latestActivity = queryResult[0];
            console.log(`📝 Latest activity: ${latestActivity.activityType} - ${latestActivity.content.substring(0, 40)}...`);
          }
          
          // Wait 5 seconds before next sync
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error(`❌ Mock sync attempt ${syncCount} failed:`, error);
          // Continue with next attempt
        }
      }

      console.log('\n🎉 Mock Twitter Sync Test Completed!');
      console.log(`📈 Total sync attempts: ${syncCount}`);
      console.log('─'.repeat(60));

      // 7. Final verification
      console.log('7️⃣ Final verification...');
      const finalActivityCheck = await this.hypergraphClient.hasRecentTwitterActivity(this.testUserAddress, 24);
      const finalActivityCount = await this.hypergraphClient.getTwitterActivities(this.testUserAddress, 24);
      
      console.log(`✅ Final status:`);
      console.log(`   - Recent activity detected: ${finalActivityCheck ? 'YES' : 'NO'}`);
      console.log(`   - Total activities in Hypergraph: ${finalActivityCount.length}`);
      
      // Show sample activities
      if (finalActivityCount.length > 0) {
        console.log(`\n📋 Sample activities in Hypergraph:`);
        finalActivityCount.slice(0, 3).forEach((activity, index) => {
          console.log(`   ${index + 1}. [${activity.activityType}] ${activity.content.substring(0, 60)}...`);
          console.log(`      - Tweet ID: ${activity.metadata.tweetId}`);
          console.log(`      - Likes: ${activity.metadata.likeCount}, Retweets: ${activity.metadata.retweetCount}`);
          console.log(`      - Time: ${activity.timestamp.toISOString()}`);
        });
      }

    } catch (error) {
      console.error('❌ Mock test failed:', error);
    } finally {
      // Clean up
      await this.db.close();
      console.log('🧹 Database connection closed');
    }
  }

  /**
   * Print test configuration
   */
  printConfig(): void {
    console.log('📋 Mock Test Configuration:');
    console.log(`   - User Address: ${this.testUserAddress}`);
    console.log(`   - Twitter API: 🎭 Mock (No API calls)`);
    console.log(`   - Hypergraph Public Space ID: ${process.env.HYPERGRAPH_PUBLIC_SPACE_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log('─'.repeat(60));
  }
}

// Main execution
async function main() {
  // Update this user address for your test
  const testUserAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae';
  
  const test = new TwitterSyncMockTest(testUserAddress);
  
  test.printConfig();
  await test.runMockTest();
}

// Run the test
main().catch(console.error);
