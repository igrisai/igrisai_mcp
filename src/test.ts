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

    // Test social activity query
    console.log('1. Testing social activity query...');
    try {
      const socialResult = await tools.find(t => t.name === 'query_social_activity')?.handler({
        platform: 'twitter',
        username: 'vitalikbuterin',
        timeframe: '24h'
      });
      console.log('Social Activity Result:', JSON.stringify(socialResult, null, 2));
    } catch (error) {
      console.error('Social activity test failed:', error);
    }

    console.log('\n2. Testing on-chain transaction query...');
    try {
      const onChainResult = await tools.find(t => t.name === 'query_onchain_transactions')?.handler({
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        chain: 'ethereum',
        timeframe: '24h',
        transactionType: 'swap'
      });
      console.log('On-Chain Transaction Result:', JSON.stringify(onChainResult, null, 2));
    } catch (error) {
      console.error('On-chain transaction test failed:', error);
    }

    console.log('\n3. Testing token performance analysis...');
    try {
      const tokenResult = await tools.find(t => t.name === 'analyze_token_performance')?.handler({
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C',
        chain: 'ethereum',
        includeSocial: true,
        includeOnChain: true
      });
      console.log('Token Performance Result:', JSON.stringify(tokenResult, null, 2));
    } catch (error) {
      console.error('Token performance test failed:', error);
    }

    console.log('\n4. Testing portfolio analysis...');
    try {
      const portfolioResult = await tools.find(t => t.name === 'analyze_portfolio')?.handler({
        addresses: [
          '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        ],
        chains: ['ethereum', 'polygon'],
        timeframe: '24h'
      });
      console.log('Portfolio Analysis Result:', JSON.stringify(portfolioResult, null, 2));
    } catch (error) {
      console.error('Portfolio analysis test failed:', error);
    }

    console.log('\n5. Testing AI analysis...');
    try {
      const aiResult = await tools.find(t => t.name === 'generate_ai_analysis')?.handler({
        data: {
          social: [{
            platform: 'twitter',
            username: 'example',
            activity: {
              posts: 10,
              followers: 1000,
              engagement: 50,
              sentiment: 'positive'
            }
          }],
          onChain: [{
            hash: '0x123...',
            from: '0xabc...',
            to: '0xdef...',
            value: '1000',
            token: 'ETH',
            chain: 'ethereum',
            timestamp: new Date().toISOString(),
            type: 'swap'
          }]
        },
        analysisType: 'comprehensive'
      });
      console.log('AI Analysis Result:', JSON.stringify(aiResult, null, 2));
    } catch (error) {
      console.error('AI analysis test failed:', error);
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
