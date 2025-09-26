import WebSocket from 'ws';
import axios from 'axios';

// WebSocket client test for Dead Hand Switch System
class TokenActivityTestClient {
  private ws: WebSocket;
  private userAddress: string;
  private httpBaseUrl: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.httpBaseUrl = 'http://localhost:3000';
    this.ws = new WebSocket('ws://localhost:3000');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', () => {
      console.log('✅ Connected to Dead Hand Switch WebSocket Server');
      this.startTests();
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 Disconnected from server');
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  private handleMessage(message: any): void {
    console.log('\n📨 Received message:', JSON.stringify(message, null, 2));

    switch (message.type) {
      case 'connection_established':
        console.log('✅ Connection established successfully');
        break;
      
      case 'token_activity_update':
        console.log(`📊 Token activity update for ${message.tokenAddress}:`);
        if (message.data?.toolUsed) {
          console.log(`  🛠️  Tool Used: ${message.data.toolUsed}`);
        }
        if (message.data?.reasoning) {
          console.log(`  💭 Reasoning: ${message.data.reasoning}`);
        }
        if (message.data?.parameters) {
          console.log(`  ⚙️  Parameters:`, JSON.stringify(message.data.parameters, null, 2));
        }
        if (message.data?.result) {
          console.log(`  📊 Result:`, JSON.stringify(message.data.result, null, 2));
        }
        break;
      
      case 'prompt_execution_result':
        console.log(`🤖 AI Prompt Execution Result:`);
        console.log(`  🛠️  Tool Used: ${message.data?.toolUsed}`);
        console.log(`  💭 Reasoning: ${message.data?.reasoning}`);
        console.log(`  ⚙️  Parameters:`, JSON.stringify(message.data?.parameters, null, 2));
        console.log(`  📊 Result:`, JSON.stringify(message.data?.result, null, 2));
        break;
      
      case 'deadhand_check_result':
        console.log(`🔍 Dead Hand Check Result:`);
        console.log(`  👤 User: ${message.userAddress}`);
        console.log(`  🤖 AI Response: ${message.data?.aiResponse}`);
        console.log(`  📊 Activity Found: ${message.data?.activityFound}`);
        console.log(`  📝 Transaction Data:`, JSON.stringify(message.data?.transactionData, null, 2));
        break;
      
      case 'deadhand_switch_triggered':
        console.log(`🚨 DEAD HAND SWITCH TRIGGERED:`);
        console.log(`  👤 User: ${message.userAddress}`);
        console.log(`  🏦 Smart Account: ${message.data?.smartAccount}`);
        console.log(`  📝 Message: ${message.data?.message}`);
        break;
      
      case 'deadhand_timer_reset':
        console.log(`⏰ DEAD HAND TIMER RESET:`);
        console.log(`  👤 User: ${message.userAddress}`);
        console.log(`  ⏱️  Timeout: ${message.data?.timeoutSeconds} seconds`);
        console.log(`  📅 Scheduled At: ${message.data?.scheduledAt}`);
        console.log(`  📝 Message: ${message.data?.message}`);
        break;
      
      case 'ai_status_update':
        console.log(`🤖 AI Status Update:`);
        console.log(`  👤 User: ${message.userAddress}`);
        console.log(`  📊 Type: ${message.data?.statusType}`);
        console.log(`  📝 Message: ${message.data?.message}`);
        console.log(`  ⏰ Time: ${message.data?.timestamp}`);
        break;
      
      case 'error':
        console.error('❌ Server error:', message.error);
        break;
      
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  private startTests(): void {
    console.log('\n🧪 Starting Dead Hand Switch Test...\n');

    // Test: Call initiate dead hand endpoint
    setTimeout(() => {
      console.log('🚀 Initiating dead hand check...');
      this.initiateDeadHand();
    }, 1000);

    // Keep connection open - don't close automatically
    console.log('📡 Listening for WebSocket events...');
    console.log('💡 Connection will stay open to monitor events');
  }


  // Initiate dead hand check via HTTP endpoint
  private async initiateDeadHand(): Promise<void> {
    try {
      console.log(`📡 Calling POST ${this.httpBaseUrl}/initiate-deadhand`);
      console.log(`👤 User Address: ${this.userAddress}`);
      
      const response = await axios.post(`${this.httpBaseUrl}/initiate-deadhand`, {
        userAddress: this.userAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Dead hand check initiated successfully:');
      console.log(`  📊 Status: ${response.data.status}`);
      console.log(`  📝 Message: ${response.data.message}`);
      if (response.data.scheduledAt) {
        console.log(`  📅 Scheduled At: ${response.data.scheduledAt}`);
      }
      if (response.data.timeoutSeconds) {
        console.log(`  ⏱️  Timeout: ${response.data.timeoutSeconds} seconds`);
      }
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ HTTP Error:', error.response?.data || error.message);
      } else {
        console.error('❌ Error initiating dead hand check:', error);
      }
    }
  }


  // Close the connection
  public close(): void {
    this.ws.close();
    console.log('✅ Test client closed!');
  }
}

// Run the test
async function runWebSocketTest() {
  console.log('🚀 Starting Dead Hand Switch Test Client\n');
  
  const userAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae'; // STRICT: DONT MODIFY THIS
  
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`🌐 WebSocket URL: ws://localhost:3000`);
  console.log(`🌐 HTTP URL: http://localhost:3000\n`);
  
  // Create and start the test client
  const testClient = new TokenActivityTestClient(userAddress);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    testClient.close();
    process.exit(0);
  });
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWebSocketTest().catch(console.error);
}
