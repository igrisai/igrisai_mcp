import WebSocket from 'ws';

// Example WebSocket client to test the IgrisAI Token Activity Server
class TokenActivityClient {
  private ws: WebSocket;
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.ws = new WebSocket('ws://localhost:8080');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', () => {
      console.log('Connected to IgrisAI Token Activity Server');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('Disconnected from server');
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(message: any): void {
    console.log('Received message:', JSON.stringify(message, null, 2));

    switch (message.type) {
      case 'connection_established':
        console.log('✅ Connection established successfully');
        break;
      
      case 'token_activity_update':
        console.log(`📊 Token activity update for ${message.tokenAddress}:`);
        if (message.data?.transferData) {
          console.log('  Transfer Data:', message.data.transferData);
        }
        if (message.data?.swapData) {
          console.log('  Swap Data:', message.data.swapData);
        }
        if (message.data?.aiAnalysis) {
          console.log('  AI Analysis:', message.data.aiAnalysis);
        }
        break;
      
      case 'error':
        console.error('❌ Server error:', message.error);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Subscribe to token activity updates
  subscribeToToken(tokenAddress: string, chain: string = 'ethereum'): void {
    const message = {
      type: 'subscribe_token_activity',
      userAddress: this.userAddress,
      tokenAddress,
      chain,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`📡 Subscribed to ${tokenAddress} activity on ${chain}`);
  }

  // Unsubscribe from token activity updates
  unsubscribeFromToken(tokenAddress: string): void {
    const message = {
      type: 'unsubscribe_token_activity',
      userAddress: this.userAddress,
      tokenAddress,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`📡 Unsubscribed from ${tokenAddress} activity`);
  }

  // Get comprehensive token analysis
  getTokenAnalysis(tokenAddress: string, chain: string = 'ethereum'): void {
    const message = {
      type: 'get_token_analysis',
      userAddress: this.userAddress,
      tokenAddress,
      chain,
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`🔍 Requesting analysis for ${tokenAddress} on ${chain}`);
  }

  // Close the connection
  close(): void {
    this.ws.close();
  }
}

// Example usage
async function example() {
  console.log('🚀 Starting IgrisAI Token Activity Client Example\n');

  // Create client with user address
  const client = new TokenActivityClient('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

  // Wait for connection to be established
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Example token addresses (replace with real ones)
  const exampleToken = '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C';

  // Subscribe to token activity
  client.subscribeToToken(exampleToken, 'ethereum');

  // Get immediate analysis
  client.getTokenAnalysis(exampleToken, 'ethereum');

  // Wait for some updates
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Unsubscribe
  client.unsubscribeFromToken(exampleToken);

  // Close connection
  setTimeout(() => {
    client.close();
    console.log('\n✅ Example completed');
  }, 2000);
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}

export { TokenActivityClient };
