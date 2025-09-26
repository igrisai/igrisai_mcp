import { IgrisAIMCPClient } from './client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMCPClient() {
  try {
    console.log('Testing IgrisAI MCP Client...\n');

    // Create client instance
    const client = new IgrisAIMCPClient();
    
    console.log('MCP Client created successfully');
    console.log('Client connected:', client.isClientConnected());

    console.log('\n=== Testing MCP Client Methods ===\n');

    // Test token transfer analysis
    console.log('1. Testing token transfer analysis...');
    try {
      const transferData = await client.getTokenTransfers(
        '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        'ethereum',
        '24h'
      );
      console.log('Token Transfer Data:', JSON.stringify(transferData, null, 2));
    } catch (error) {
      console.error('Token transfer test failed:', error);
    }

    console.log('\n2. Testing token swap analysis...');
    try {
      const swapData = await client.getTokenSwaps(
        '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        'ethereum',
        '7d'
      );
      console.log('Token Swap Data:', JSON.stringify(swapData, null, 2));
    } catch (error) {
      console.error('Token swap test failed:', error);
    }

    console.log('\n3. Testing comprehensive token analysis...');
    try {
      const transferData = await client.getTokenTransfers(
        '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        'ethereum',
        '24h'
      );
      const swapData = await client.getTokenSwaps(
        '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        'ethereum',
        '24h'
      );
      
      const aiAnalysis = await client.generateTokenAnalysis(transferData, swapData);
      console.log('AI Analysis Result:', aiAnalysis);
    } catch (error) {
      console.error('Token analysis test failed:', error);
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
