import WebSocket from 'ws';

// WebSocket client test for IgrisAI Token Activity Server
class TokenActivityTestClient {
  private ws: WebSocket;
  private userAddress: string;
  private tokenAddress: string;

  constructor(userAddress: string, tokenAddress: string) {
    this.userAddress = userAddress;
    this.tokenAddress = tokenAddress;
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
    console.log('\n🧪 Starting WebSocket Tests...\n');

    // Test 1: Get immediate token analysis
    setTimeout(() => {
      console.log('🔍 Test 1: Requesting immediate token analysis...');
      this.getTokenAnalysis();
    }, 1000);

    // Test 2: Subscribe to real-time updates
    setTimeout(() => {
      console.log('📡 Test 2: Subscribing to real-time token activity...');
      this.subscribeToToken();
    }, 3000);

    // Test 3: Wait for real-time updates (30 seconds)
    setTimeout(() => {
      console.log('⏰ Test 3: Waiting for real-time updates (30 seconds)...');
    }, 5000);

    // Test 4: AI-driven prompt execution
    setTimeout(() => {
      console.log('🤖 Test 4: Testing AI-driven prompt execution...');
      this.testAIPrompt();
    }, 35000);

    // Test 5: Unsubscribe
    setTimeout(() => {
      console.log('📡 Test 5: Unsubscribing from token activity...');
      this.unsubscribeFromToken();
    }, 40000);

    // Test 6: Close connection
    setTimeout(() => {
      console.log('🔌 Test 6: Closing connection...');
      this.close();
    }, 45000);
  }

  // Get comprehensive token analysis
  private getTokenAnalysis(): void {
    const message = {
      type: 'get_token_analysis',
      userAddress: this.userAddress,
      tokenAddress: this.tokenAddress,
      chain: 'ethereum',
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`🔍 Requesting analysis for ${this.tokenAddress}`);
  }

  // Subscribe to token activity updates
  private subscribeToToken(): void {
    const message = {
      type: 'subscribe_token_activity',
      userAddress: this.userAddress,
      tokenAddress: this.tokenAddress,
      chain: 'ethereum',
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`📡 Subscribing to ${this.tokenAddress} activity on ethereum`);
  }

  // Test AI-driven prompt execution
  private testAIPrompt(): void {
    const prompts = [
      `Show me recent transfers for token ${this.tokenAddress}`,
      `Get swap data for ${this.tokenAddress} on ethereum`,
      `Analyze token activity for ${this.tokenAddress}`,
    ];

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    const message = {
      type: 'execute_prompt',
      userAddress: this.userAddress,
      userPrompt: randomPrompt,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`🤖 Testing AI prompt: "${randomPrompt}"`);
  }

  // Unsubscribe from token activity updates
  private unsubscribeFromToken(): void {
    const message = {
      type: 'unsubscribe_token_activity',
      userAddress: this.userAddress,
      tokenAddress: this.tokenAddress,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`📡 Unsubscribing from ${this.tokenAddress} activity`);
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
  
  const userAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const tokenAddress = '0xb6A9f22642C126D2700CbD17940b334e866234ae';
  
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`🪙 Token Address: ${tokenAddress}`);
  console.log(`🌐 WebSocket URL: ws://localhost:8080\n`);
  
  // Create and start the test client
  const testClient = new TokenActivityTestClient(userAddress, tokenAddress);
  
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
