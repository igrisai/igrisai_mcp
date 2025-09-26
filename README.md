# IgrisAI Token Activity WebSocket Server

A WebSocket server that provides real-time token activity monitoring using Graph MCP server for blockchain data and OpenRouter AI for analysis.

## Features

- **Real-time Token Monitoring**: WebSocket-based real-time token activity updates
- **Graph MCP Integration**: Uses The Graph's MCP server for blockchain data
- **AI-Powered Analysis**: OpenRouter AI integration for comprehensive token insights
- **Multi-Chain Support**: Support for Ethereum, Polygon, Arbitrum, Optimism, and Base networks
- **User Address Tracking**: Track token activity for specific user addresses

## Architecture

This is a **WebSocket server** that acts as an **MCP client** to:
1. Connect to The Graph MCP server for token data
2. Provide real-time WebSocket endpoints for clients
3. Use OpenRouter AI for analysis and insights

## Prerequisites

- Node.js 18+ 
- npm or pms package manager
- OpenRouter API key
- The Graph Market JWT Access Token

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
GRAPH_ACCESS_TOKEN=your_graph_market_jwt_access_token_here
```

## Usage

### Building the Project

```bash
npm run build
```

### Running the WebSocket Server

```bash
npm run dev
# or
npm start
```

The server will start on `ws://localhost:8080`

## WebSocket API

### Connection
Connect to `ws://localhost:8080`

### Message Types

#### 1. Subscribe to Token Activity
Subscribe to real-time token activity updates.

**Message:**
```json
{
  "type": "subscribe_token_activity",
  "userAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C",
  "chain": "ethereum"
}
```

**Response:**
```json
{
  "type": "token_activity_update",
  "userAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C",
  "chain": "ethereum",
  "data": {
    "status": "subscribed"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Unsubscribe from Token Activity
Stop receiving updates for a specific token.

**Message:**
```json
{
  "type": "unsubscribe_token_activity",
  "userAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C"
}
```

#### 3. Get Token Analysis
Get comprehensive token analysis with AI insights.

**Message:**
```json
{
  "type": "get_token_analysis",
  "userAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C",
  "chain": "ethereum"
}
```

**Response:**
```json
{
  "type": "token_activity_update",
  "userAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "tokenAddress": "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C",
  "chain": "ethereum",
  "data": {
    "transferData": {
      "totalTransfers": 150,
      "uniqueAddresses": 45,
      "totalVolume": "1000000",
      "averageTransferSize": "6666.67",
      "topSenders": ["0x123...", "0x456..."],
      "topReceivers": ["0x789...", "0xabc..."],
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "swapData": {
      "totalSwaps": 75,
      "averagePrice": "0.05",
      "priceChange": "+15%",
      "totalVolume": "500000",
      "liquidityChanges": "+5%",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "aiAnalysis": "Based on the token activity data, this token shows strong trading volume..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## MCP Configuration

The `mcpConfig.json` file shows how to configure MCP clients to use The Graph MCP server:

```json
{
  "mcpServers": {
    "token-api": {
      "command": "npx",
      "args": ["@pinax/mcp", "--sse-url", "https://token-api.mcp.thegraph.com/sse"],
      "env": {
        "ACCESS_TOKEN": "<https://thegraph.market JWT Access Token>"
      }
    }
  }
}
```

## Client Example

See `src/websocketClientExample.ts` for a complete WebSocket client example:

```typescript
import { TokenActivityClient } from './websocketClientExample.js';

const client = new TokenActivityClient('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

// Subscribe to token activity
client.subscribeToToken('0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C', 'ethereum');

// Get analysis
client.getTokenAnalysis('0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C', 'ethereum');
```

## API Keys

### OpenRouter API Key
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key
4. Add it to your `.env` file

### The Graph Market JWT Access Token
1. Visit [The Graph Market](https://thegraph.market/)
2. Sign up for an account
3. Generate a JWT Access Token
4. Add it to your `.env` file

## Supported Networks

- **Ethereum**: Mainnet transactions and DeFi protocols
- **Polygon**: Layer 2 scaling solution
- **Arbitrum**: Optimistic rollup
- **Optimism**: Optimistic rollup
- **Base**: Coinbase's Layer 2 solution

## Development

### Project Structure

```
src/
├── index.ts                    # Main WebSocket server entry point
├── websocketServer.ts          # WebSocket server implementation
├── client.ts                   # MCP client for Graph integration
├── websocketClientExample.ts   # Example WebSocket client
├── test.ts                     # Test script
├── config/
│   └── index.ts                # Configuration and constants
├── types/
│   ├── index.ts                # Type definitions
│   └── schemas.ts              # Zod schemas for validation
└── tools/
    └── openRouterClient.ts     # OpenRouter API client
```

### Testing

```bash
# Test the MCP client
npm run test

# Run the WebSocket client example
tsx src/websocketClientExample.ts
```

## Real-time Monitoring

The server monitors token activity every 30 seconds and sends updates to subscribed clients. It:

1. Connects to The Graph MCP server
2. Fetches token transfer and swap data
3. Generates AI analysis using OpenRouter
4. Broadcasts updates to all subscribed WebSocket clients

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