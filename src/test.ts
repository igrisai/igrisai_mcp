import WebSocket from 'ws';

// WebSocket client test for IgrisAI Token Activity Server
class TokenActivityTestClient {
  private ws: WebSocket;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.ws = new WebSocket('ws://localhost:8080');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', () => {
      console.log('✅ Connected to IgrisAI Token Activity Server');
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
      
      case 'error':
        console.error('❌ Server error:', message.error);
        break;
      
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  private startTests(): void {
    console.log('\n🧪 Starting WebSocket Test...\n');

    // Test: AI-driven prompt execution
    setTimeout(() => {
      console.log('🤖 Testing AI-driven prompt execution...');
      this.testAIPrompt();
    }, 1000);

    // Close connection after test
    setTimeout(() => {
      console.log('🔌 Closing connection...');
      this.close();
    }, 10000);
  }


  // Test AI-driven prompt execution
  private testAIPrompt(): void {
    const prompts = [
      `Check if any tokens have been transferred recieved to wallet address ${this.userAddress} on polygon in a week?`
    ];

    const randomPrompt = prompts[0];
    
    const message = {
      type: 'execute_prompt',
      userAddress: this.userAddress,
      userPrompt: randomPrompt,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`🤖 Testing AI prompt: "${randomPrompt}"`);
  }


  // Close the connection
  public close(): void {
    this.ws.close();
    console.log('✅ All tests completed!');
  }
}

// Run the test
async function runWebSocketTest() {
  console.log('🚀 Starting IgrisAI WebSocket Test Client\n');
  
  const userAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae'; // STRICT: DONT MODIFY THIS
  
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`🌐 WebSocket URL: ws://localhost:8080\n`);
  
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
