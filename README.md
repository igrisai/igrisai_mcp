# IgrisAI MCP Client

A Model Context Protocol (MCP) client for OpenRouter AI with Graph MCP integration to analyze token transfers and swaps across Ethereum and other blockchain networks.

## Features

- **Token Transfer Analysis**: Analyze token transfer events using Graph MCP and OpenRouter AI
- **Token Swap Analysis**: Analyze token swap events and trading patterns
- **AI-Powered Insights**: Generate comprehensive analysis using OpenRouter's AI models
- **Multi-Chain Support**: Support for Ethereum, Polygon, Arbitrum, Optimism, and Base networks
- **Comprehensive Token Insights**: Combine transfer and swap data for holistic analysis

## Prerequisites

- Node.js 18+ 
- npm or pms package manager
- OpenRouter API key
- The Graph API key (optional but recommended)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd igrisai_mcp
```

2. Install dependencies:
```bash
pms i
```

3. Set up environment variables:
```bash
cp env.example .env
```

Edit `.env` and add your API keys:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
GRAPH_API_KEY=your_graph_api_key_here
MCP_SERVER_URL=http://localhost:3000
```

## Usage

### Building the Project

```bash
npm run build
```

### Running the MCP Server

```bash
npm run start
```

### Development Mode

```bash
npm run dev
```

## Available Tools

### 1. Query Social Activity
Analyze social media activity from various platforms.

**Parameters:**
- `platform`: Social media platform (twitter, telegram, discord, reddit)
- `username`: Username or handle to analyze
- `timeframe`: Time period for analysis (1h, 24h, 7d, 30d)

**Example:**
```json
{
  "tool": "query_social_activity",
  "parameters": {
    "platform": "twitter",
    "username": "vitalikbuterin",
    "timeframe": "24h"
  }
}
```

### 2. Query On-Chain Transactions
Analyze blockchain transactions using The Graph protocol.

**Parameters:**
- `address`: Wallet address to analyze
- `chain`: Blockchain network (ethereum, polygon, arbitrum, optimism, base)
- `timeframe`: Time period for analysis (1h, 24h, 7d, 30d)
- `transactionType`: Type of transactions (swap, transfer, mint, burn, all)

**Example:**
```json
{
  "tool": "query_onchain_transactions",
  "parameters": {
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "chain": "ethereum",
    "timeframe": "7d",
    "transactionType": "swap"
  }
}
```

### 3. Analyze Token Performance
Comprehensive token analysis combining social and on-chain data.

**Parameters:**
- `tokenAddress`: Token contract address
- `chain`: Blockchain network
- `includeSocial`: Include social media analysis
- `includeOnChain`: Include on-chain transaction analysis

**Example:**
```json
{
  "tool": "analyze_token_performance",
  "parameters": {
    "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C",
    "chain": "ethereum",
    "includeSocial": true,
    "includeOnChain": true
  }
}
```

### 4. Analyze Portfolio
Analyze portfolio performance across multiple addresses and chains.

**Parameters:**
- `addresses`: Array of wallet addresses to analyze
- `chains`: Blockchain networks to include
- `timeframe`: Time period for analysis

**Example:**
```json
{
  "tool": "analyze_portfolio",
  "parameters": {
    "addresses": [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
    ],
    "chains": ["ethereum", "polygon"],
    "timeframe": "24h"
  }
}
```

### 5. Generate AI Analysis
Generate AI-powered analysis using OpenRouter.

**Parameters:**
- `data`: Data to analyze (social activity, on-chain data, or both)
- `analysisType`: Type of analysis (social, onchain, comprehensive, trading)

**Example:**
```json
{
  "tool": "generate_ai_analysis",
  "parameters": {
    "data": {
      "social": [{"platform": "twitter", "username": "example", "activity": {"posts": 10, "followers": 1000}}],
      "onChain": [{"hash": "0x123...", "from": "0xabc...", "to": "0xdef...", "value": "1000"}]
    },
    "analysisType": "comprehensive"
  }
}
```

## MCP Configuration

The `mcpConfig.json` file contains the configuration for MCP clients. You can use this configuration to integrate the IgrisAI MCP client with your preferred MCP client.

## API Keys

### OpenRouter API Key
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key
4. Add it to your `.env` file

### The Graph API Key
1. Visit [The Graph](https://thegraph.com/)
2. Sign up for an account
3. Generate an API key
4. Add it to your `.env` file

## Supported Networks

- **Ethereum**: Mainnet transactions and DeFi protocols
- **Polygon**: Layer 2 scaling solution
- **Arbitrum**: Optimistic rollup
- **Optimism**: Optimistic rollup
- **Base**: Coinbase's Layer 2 solution

## Supported Social Platforms

- **Twitter**: Social media posts and engagement
- **Telegram**: Channel activity and messages
- **Discord**: Server activity and messages
- **Reddit**: Posts and comments

## Development

### Project Structure

```
src/
├── client.ts              # Main MCP client implementation
├── server.ts              # MCP server implementation
├── index.ts               # Entry point
├── config/
│   └── index.ts           # Configuration and constants
├── types/
│   ├── index.ts           # Type definitions
│   └── schemas.ts         # Zod schemas for validation
└── tools/
    ├── graphMCPTools.ts   # Graph protocol integration
    └── openRouterClient.ts # OpenRouter API client
```

### Adding New Tools

1. Define the tool schema in `src/types/schemas.ts`
2. Implement the tool handler in `src/tools/`
3. Register the tool in `src/client.ts`
4. Update `mcpConfig.json` with the new tool definition

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please open an issue on GitHub.
