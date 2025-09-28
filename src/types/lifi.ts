// LiFi SDK types for dead hand switch implementation

export interface Token {
  address: string;
  chain?: {
    chainId: number;
  };
  decimals: number;
  tokenId: string;
}

export interface TransactionRequest {
  to: string;
  value?: bigint;
  data?: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface DeadHandSwitchResult {
  transactions: TransactionRequest[];
  message: string;
  requiresUserAction: boolean;
  chainId: number;
  chainName: string;
  rpcUrl: string;
}

export interface BridgeQuote {
  transaction: {
    to: string;
    value: string;
    data: string;
  };
  approvalAddress: string;
}

export interface TokenBalance {
  token: Token;
  balance: string; // Balance as string to handle large numbers
}
