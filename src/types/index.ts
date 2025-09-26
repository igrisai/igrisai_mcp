export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface MCPConfig {
  openrouter: OpenRouterConfig;
}

export interface TokenTransferData {
  totalTransfers: number;
  uniqueAddresses: number;
  totalVolume: string;
  averageTransferSize?: string;
  topSenders?: string[];
  topReceivers?: string[];
  timestamp: string;
}

export interface TokenSwapData {
  totalSwaps: number;
  averagePrice: string;
  priceChange: string;
  totalVolume: string;
  liquidityChanges?: string;
  timestamp: string;
}

export interface TokenInsights {
  tokenAddress: string;
  chain: string;
  transferData: TokenTransferData;
  swapData: TokenSwapData;
  aiAnalysis: string;
  timestamp: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  examples?: string[];
}

export interface AIToolSelection {
  selectedTool: string;
  parameters: Record<string, any>;
  reasoning: string;
}
