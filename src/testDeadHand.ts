import WebSocket from 'ws';

// WebSocket client test for Dead Hand Switch System
class DeadHandTestClient {
  private ws: WebSocket;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.ws = new WebSocket('ws://localhost:8080');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', () => {
      console.log('✅ Connected to Dead Hand Switch WebSocket Server');
      this.startTest();
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
      
      case 'error':
        console.error('❌ Server error:', message.error);
        break;
      
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  private startTest(): void {
    console.log('\n🧪 Starting Dead Hand Switch Test...\n');
    console.log('📡 Listening for WebSocket messages...');
    console.log('💡 Use the HTTP endpoint to initiate dead hand checks:');
    console.log('   curl -X POST http://localhost:3000/initiate-deadhand \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"userAddress": "${this.userAddress}"}'`);
    console.log('\n⏳ Waiting for events...\n');
  }

  // Close the connection
  public close(): void {
    this.ws.close();
    console.log('✅ Test client closed!');
  }
}

// Run the test
async function runDeadHandTest() {
  console.log('🚀 Starting Dead Hand Switch Test Client\n');
  
  const userAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae';
  
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`🌐 WebSocket URL: ws://localhost:8080`);
  console.log(`🌐 HTTP URL: http://localhost:3000\n`);
  
  // Create and start the test client
  const testClient = new DeadHandTestClient(userAddress);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    testClient.close();
    process.exit(0);
  });
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDeadHandTest().catch(console.error);
}
