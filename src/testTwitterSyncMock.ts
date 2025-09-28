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
      "Just deployed a new feature to our dead man switch switch system! 🚀",
      "Working on Hypergraph integration for Twitter activity monitoring 📊",
      "Testing the MCP client with Graph protocol data 🔗",
      "dead man switch switch is looking solid! Great progress today 💪",
      "Integrating AI with blockchain data for automated monitoring 🤖"
    ];

    const mockLikes = [
      "Love this approach to decentralized monitoring!",
      "Great work on the Hypergraph integration!",
      "This dead man switch switch concept is brilliant 🔥",
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
    console.log('🚀 Starting Simple Hypergraph Save & Fetch Test...');
    console.log(`📧 Test User Address: ${this.testUserAddress}`);
    console.log('🎭 Using Mock Data (No Twitter API calls)');
    console.log('─'.repeat(60));

    try {
      // 1. Test database connection
      console.log('1️⃣ Testing database connection...');
      await this.db.testConnection();
      console.log('✅ Database connection successful');

      // 2. Generate ONE mock activity for testing
      console.log('2️⃣ Generating ONE mock Twitter activity...');
      const mockActivities = this.generateMockTwitterActivities(1);
      const activity = mockActivities[0];
      console.log(`✅ Generated activity:`);
      console.log(`   - Type: ${activity.activityType}`);
      console.log(`   - Content: ${activity.content}`);
      console.log(`   - User: ${activity.userAddress}`);
      console.log(`   - Time: ${activity.timestamp.toISOString()}`);

      // 3. SAVE to Hypergraph
      console.log('3️⃣ SAVING to Hypergraph...');
      await this.hypergraphClient.syncTwitterActivities(mockActivities);
      console.log(`✅ Successfully SAVED 1 activity to Hypergraph`);

      // 4. Wait a moment for indexing
      console.log('4️⃣ Waiting 3 seconds for data to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 5. FETCH from Hypergraph
      console.log('5️⃣ FETCHING from Hypergraph...');
      const queryResult = await this.hypergraphClient.getTwitterActivities(this.testUserAddress, 24);
      console.log(`🔍 FETCH result: ${queryResult.length} activities found`);
      
      // 6. Show detailed results
      console.log('6️⃣ Detailed Results:');
      if (queryResult.length > 0) {
        console.log(`✅ SUCCESS: Data was saved and retrieved!`);
        queryResult.forEach((retrievedActivity, index) => {
          console.log(`   Activity ${index + 1}:`);
          console.log(`   - Type: ${retrievedActivity.activityType}`);
          console.log(`   - Content: ${retrievedActivity.content}`);
          console.log(`   - User: ${retrievedActivity.userAddress}`);
          console.log(`   - Time: ${retrievedActivity.timestamp.toISOString()}`);
          console.log(`   - Tweet ID: ${retrievedActivity.metadata.tweetId}`);
        });
      } else {
        console.log(`❌ ISSUE: Data was saved but not retrieved`);
        console.log(`   This could mean:`);
        console.log(`   - Data is still being indexed`);
        console.log(`   - Query functionality needs implementation`);
        console.log(`   - Different data format than expected`);
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
