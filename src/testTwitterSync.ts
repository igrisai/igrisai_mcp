import { TwitterSyncService } from './twitterSyncService.js';
import { HypergraphClient } from './hypergraphClient.js';
import { DatabaseManager } from './database.js';
import { TwitterAuth } from './types/deadHand.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class TwitterSyncTest {
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
   * Run the Twitter sync test for 30 seconds
   */
  async runTest(): Promise<void> {
    console.log('🚀 Starting Twitter Sync Test...');
    console.log(`📧 Test User Address: ${this.testUserAddress}`);
    console.log('⏱️  Test Duration: 30 seconds');
    console.log('─'.repeat(50));

    try {
      // 1. Test database connection
      console.log('1️⃣ Testing database connection...');
      await this.db.testConnection();
      console.log('✅ Database connection successful');

      // 2. Get Twitter auth from database
      console.log('2️⃣ Fetching Twitter OAuth credentials...');
      const twitterAuth = await this.db.getTwitterAuth(this.testUserAddress);
      
      if (!twitterAuth) {
        console.log('❌ No Twitter auth found for this user address');
        console.log('💡 Please add Twitter OAuth credentials to the database first');
        return;
      }
      
      console.log('✅ Twitter auth found:', {
        twitterUserId: twitterAuth.twitterUserId,
        twitterUserName: twitterAuth.twitterUserName,
        expiresAt: twitterAuth.expiresAt
      });

      // 3. Test Twitter API connection
      console.log('3️⃣ Testing Twitter API connection...');
      const testActivities = await this.twitterSyncService.fetchTwitterActivities(twitterAuth, 1); // Last 1 hour
      console.log(`✅ Twitter API connection successful - found ${testActivities.length} activities in last hour`);

      // 4. Test Hypergraph sync
      console.log('4️⃣ Testing Hypergraph sync...');
      if (testActivities.length > 0) {
        await this.hypergraphClient.syncTwitterActivities(testActivities);
        console.log(`✅ Hypergraph sync successful - synced ${testActivities.length} activities`);
      } else {
        console.log('ℹ️  No activities to sync to Hypergraph');
      }

      // 5. Test Hypergraph query
      console.log('5️⃣ Testing Hypergraph query...');
      const hasRecentActivity = await this.hypergraphClient.hasRecentTwitterActivity(this.testUserAddress, 24);
      console.log(`✅ Hypergraph query successful - Recent activity: ${hasRecentActivity ? 'YES' : 'NO'}`);

      // 6. Continuous sync test for 30 seconds
      console.log('6️⃣ Starting continuous sync test for 30 seconds...');
      let syncCount = 0;
      const startTime = Date.now();
      const testDuration = 30000; // 30 seconds

      while (Date.now() - startTime < testDuration) {
        try {
          console.log(`\n🔄 Sync attempt ${++syncCount}...`);
          
          // Fetch recent activities (last 6 hours to catch more data)
          const activities = await this.twitterSyncService.fetchTwitterActivities(twitterAuth, 6);
          console.log(`📊 Found ${activities.length} activities in last 6 hours`);
          
          if (activities.length > 0) {
            // Sync to Hypergraph
            await this.hypergraphClient.syncTwitterActivities(activities);
            console.log(`✅ Synced ${activities.length} activities to Hypergraph`);
            
            // Test query
            const queryResult = await this.hypergraphClient.getTwitterActivities(this.testUserAddress, 24);
            console.log(`🔍 Query result: ${queryResult.length} activities found in Hypergraph`);
          } else {
            console.log('ℹ️  No new activities to sync');
          }
          
          // Wait 5 seconds before next sync
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error(`❌ Sync attempt ${syncCount} failed:`, error);
          // Continue with next attempt
        }
      }

      console.log('\n🎉 Twitter Sync Test Completed!');
      console.log(`📈 Total sync attempts: ${syncCount}`);
      console.log('─'.repeat(50));

      // 7. Final verification
      console.log('7️⃣ Final verification...');
      const finalActivityCheck = await this.hypergraphClient.hasRecentTwitterActivity(this.testUserAddress, 24);
      const finalActivityCount = await this.hypergraphClient.getTwitterActivities(this.testUserAddress, 24);
      
      console.log(`✅ Final status:`);
      console.log(`   - Recent activity detected: ${finalActivityCheck ? 'YES' : 'NO'}`);
      console.log(`   - Total activities in Hypergraph: ${finalActivityCount.length}`);

    } catch (error) {
      console.error('❌ Test failed:', error);
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
    console.log('📋 Test Configuration:');
    console.log(`   - User Address: ${this.testUserAddress}`);
    console.log(`   - Twitter API Key: ${process.env.TWITTER_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Twitter API Secret: ${process.env.TWITTER_API_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Hypergraph Public Space ID: ${process.env.HYPERGRAPH_PUBLIC_SPACE_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log('─'.repeat(50));
  }
}

// Main execution
async function main() {
  // Update this user address for your test
  const testUserAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae';
  
  const test = new TwitterSyncTest(testUserAddress);
  
  test.printConfig();
  await test.runTest();
}

// Run the test
main().catch(console.error);
