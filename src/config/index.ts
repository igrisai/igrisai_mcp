import { MCPConfig } from '../types/index.js';

export const mcpConfig: MCPConfig = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
  },
  graph: {
    apiKey: process.env.GRAPH_API_KEY || '',
    baseUrl: 'https://api.thegraph.com/subgraphs/name',
  },
  serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
};

export const graphSubgraphs = {
  ethereum: {
    uniswap: 'uniswap/uniswap-v3',
    compound: 'compound-finance/compound-v2',
    aave: 'aave/aave-v2',
  },
  polygon: {
    quickswap: 'quickswap/quickswap-v3',
    sushiswap: 'sushiswap/matic-exchange',
  },
  arbitrum: {
    uniswap: 'ianlapham/uniswap-arbitrum-one',
    sushiswap: 'sushiswap/arbitrum-exchange',
  },
  optimism: {
    uniswap: 'ianlapham/uniswap-optimism',
  },
  base: {
    uniswap: 'ianlapham/uniswap-base',
  },
};

export const socialPlatforms = {
  twitter: {
    apiUrl: 'https://api.twitter.com/2',
    endpoints: {
      user: '/users/by/username',
      tweets: '/users/{id}/tweets',
    },
  },
  telegram: {
    apiUrl: 'https://api.telegram.org/bot',
    endpoints: {
      channel: '/getChat',
      messages: '/getUpdates',
    },
  },
  discord: {
    apiUrl: 'https://discord.com/api/v10',
    endpoints: {
      guild: '/guilds/{id}',
      messages: '/channels/{id}/messages',
    },
  },
  reddit: {
    apiUrl: 'https://oauth.reddit.com/api/v1',
    endpoints: {
      user: '/user/{username}/about',
      posts: '/user/{username}/submitted',
    },
  },
};
