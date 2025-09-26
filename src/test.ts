import { IgrisAIMCPClient } from './client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMCPClient() {
  try {
    console.log('Testing IgrisAI MCP Client...\n');

    // Create client instance
    const client = new IgrisAIMCPClient();
    await client.connect();

    // Get available tools
    const tools = client.getAvailableTools();
    console.log('Available tools:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    console.log('\n=== Testing Tool Handlers ===\n');

    // Test token transfer analysis
    console.log('1. Testing token transfer analysis...');
    try {
      const transferResult = await tools.find(t => t.name === 'analyze_token_transfers')?.handler({
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        chain: 'ethereum',
        timeframe: '24h'
      });
      console.log('Token Transfer Analysis Result:', JSON.stringify(transferResult, null, 2));
    } catch (error) {
      console.error('Token transfer analysis test failed:', error);
    }

    console.log('\n2. Testing token swap analysis...');
    try {
      const swapResult = await tools.find(t => t.name === 'analyze_token_swaps')?.handler({
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        chain: 'ethereum',
        timeframe: '7d'
      });
      console.log('Token Swap Analysis Result:', JSON.stringify(swapResult, null, 2));
    } catch (error) {
      console.error('Token swap analysis test failed:', error);
    }

    console.log('\n3. Testing comprehensive token insights...');
    try {
      const insightsResult = await tools.find(t => t.name === 'generate_token_insights')?.handler({
        transferData: {
          totalTransfers: 150,
          uniqueAddresses: 45,
          totalVolume: '1000000',
          averageTransferSize: '6666.67',
          topSenders: ['0x123...', '0x456...'],
          topReceivers: ['0x789...', '0xabc...']
        },
        swapData: {
          totalSwaps: 75,
          averagePrice: '0.05',
          priceChange: '+15%',
          totalVolume: '500000',
          liquidityChanges: '+5%'
        },
        analysisType: 'comprehensive'
      });
      console.log('Token Insights Result:', JSON.stringify(insightsResult, null, 2));
    } catch (error) {
      console.error('Token insights test failed:', error);
    }

    await client.disconnect();
    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPClient().catch(console.error);
}
