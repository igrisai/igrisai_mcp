export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface GraphConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface MCPConfig {
  openrouter: OpenRouterConfig;
  graph: GraphConfig;
  serverUrl?: string;
}

export interface SocialActivityData {
  platform: string;
  username: string;
  activity: {
    posts: number;
    followers: number;
    engagement: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  timestamp: string;
}

export interface OnChainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  token: string;
  chain: string;
  timestamp: string;
  type: 'swap' | 'transfer' | 'mint' | 'burn';
}

export interface GraphQueryResult {
  data: any;
  errors?: any[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}
