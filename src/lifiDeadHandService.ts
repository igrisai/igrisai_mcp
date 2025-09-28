import { parseUnits } from 'viem';
import { Token, TransactionRequest, TransactionResult, BridgeQuote, TokenBalance, DeadHandSwitchResult } from './types/lifi';
import dotenv from 'dotenv';

dotenv.config();

export class LifiDeadHandService {
  private graphAccessToken: string;

  constructor() {
    this.graphAccessToken = process.env.GRAPH_ACCESS_TOKEN || '';
    
    if (!this.graphAccessToken) {
      throw new Error('GRAPH_ACCESS_TOKEN environment variable is required');
    }
  }

  /**
   * Get target token - pyUSDC on Arbitrum only
   */
  private getTargetToken(): Token {
    return {
      address: '0x0000000000000000000000000000000000000000', // ETH on Arbitrum
      chain: { chainId: 42161 },
      decimals: 6,
      tokenId: 'pyusdc-arbitrum',
    };
  }

  /**
   * Fetch token balances using The Graph Token API - Polygon and Arbitrum
   */
  async fetchTokenBalances(userAddress: string): Promise<Array<{ token: Token; balance: string; chainId: number }>> {
    const networks = [
      { networkId: 'matic', chainId: 137 },      // Polygon
      { networkId: 'arbitrum-one', chainId: 42161 }  // Arbitrum
    ];
    const allTokenBalances: Array<{ token: Token; balance: string; chainId: number }> = [];

    // Fetch balances from both networks
    for (const network of networks) {
      try {
        console.log(`Fetching token balances for ${userAddress} on ${network.networkId}`);
        
        const options = {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.graphAccessToken}`,
            'Content-Type': 'application/json'
          }
        };

        const response = await fetch(
          `https://token-api.thegraph.com/balances/evm/${userAddress}?network_id=${network.networkId}&limit=50&page=1`,
          options
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Raw API response for ${network.networkId}:`, JSON.stringify(data, null, 2));
        
        if (data.data && Array.isArray(data.data)) {
          // Log the structure of the first token to see available fields
          if (data.data.length > 0) {
            console.log(`First token structure:`, Object.keys(data.data[0]));
            console.log(`First token data:`, data.data[0]);
          }
          
          for (const tokenData of data.data) {
            const balance = parseFloat(tokenData.amount || tokenData.value || '0');
            console.log(`Token ${tokenData.symbol} (${tokenData.contract}): balance = ${balance}`);
            
            // Skip zero balances
            if (balance > 0) {
              const token: Token = {
                address: tokenData.contract,
                chain: { chainId: network.chainId },
                decimals: parseInt(tokenData.decimals || '18'),
                tokenId: `${tokenData.symbol?.toLowerCase()}-${network.networkId}` || `token-${network.networkId}`,
              };

              allTokenBalances.push({
                token,
                balance: tokenData.amount || tokenData.value || '0',
                chainId: network.chainId
              });
              console.log(`Added token ${token.tokenId} with balance ${balance}`);
            } else {
              console.log(`Skipped token ${tokenData.symbol} - zero balance`);
            }
          }
        }

        console.log(`Found ${data.data?.length || 0} tokens on ${network.networkId}`);
        
      } catch (error) {
        console.error(`Error fetching token balances for ${network.networkId}:`, error);
      }
    }

    console.log(`Total tokens with balances found: ${allTokenBalances.length}`);
    return allTokenBalances;
  }

  /**
   * Get bridge/swap quote using LiFi REST API
   */
  async getBridgeQuote(
    sellToken: Token,
    buyToken: Token,
    amount: string,
    recipient: string,
    sender: string
  ) {
    try {
      console.log(`Getting LiFi quote for ${sellToken.tokenId} to ${buyToken.tokenId}`);
      
      // Determine chains based on token locations
      const fromChain = sellToken.chain?.chainId || 137;
      const toChain = 42161; // Always target Arbitrum for pyUSDC

      // Use amount as-is since token API already returns correct format
      const fromAmount = amount;

      // Build query parameters for GET request
      const params = new URLSearchParams({
        fromChain: fromChain.toString(),
        fromAmount: fromAmount,
        fromToken: sellToken.address,
        fromAddress: sender,
        toChain: toChain.toString(),
        toToken: buyToken.address,
        toAddress: recipient,
        slippage: '0.5' // 0.5% slippage tolerance
      });

      const url = `https://li.quest/v1/quote?${params.toString()}`;
      console.log('LiFi quote URL:', url);

      // Call LiFi quote API with GET request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`LiFi API error: ${response.status} ${response.statusText}`);
      }

      const quote = await response.json();
      console.log('LiFi quote response:', JSON.stringify(quote, null, 2));

      console.log(`LiFi quote obtained:`, {
        from: sellToken.tokenId,
        to: buyToken.tokenId,
        amount: amount,
        recipient: recipient,
        estimatedGas: quote.estimate?.gasCosts?.[0]?.amount,
        toAmount: quote.estimate?.toAmount
      });

      return quote;
    } catch (error) {
      console.error('Error getting LiFi quote:', error);
      throw error;
    }
  }

  /**
   * Execute batch transactions using kernel client
   */
  async executeBatch(transactions: TransactionRequest[], kernelClient: any): Promise<TransactionResult[]> {
    try {
      console.log(`Executing ${transactions.length} batch transactions for kernel client:`, kernelClient);
      console.log('Batch transactions to execute:', transactions);

      // Convert transactions to the format expected by encodeCalls
      const calls = transactions.map(transaction => ({
        to: transaction.to as `0x${string}`,
        value: transaction.value || BigInt(0),
        data: (transaction.data as `0x${string}`) || '0x'
      }));

      const userOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls(calls)
      });

      const { receipt } = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash
      });

      console.log(
        'UserOp completed',
        `${receipt.transactionHash}`
      );

      // Return success for all transactions since they were batched into one UserOp
      return transactions.map(() => ({
        hash: receipt.transactionHash,
        success: true,
      }));
      
    } catch (err) {
      console.error('Batch execution failed:', err);
      return transactions.map(() => ({
        hash: "",
        success: false,
        error: err instanceof Error ? err.message : 'Batch execution failed',
      }));
    }
  }

  /**
   * Execute dead hand switch by bridging/swapping all tokens to USDC/pyUSDC
   */
  async executeDeadHandSwitch(
    userAddress: string,
    beneficiaryAddress: string,
    kernelClient: any,
    tokenBalances: Array<{ token: Token; balance: string; chainId: number }>
  ): Promise<DeadHandSwitchResult | TransactionResult[]> {
    try {
      console.log(`🚨 Executing dead hand switch for ${userAddress}`);
      console.log(`Beneficiary: ${beneficiaryAddress}`);
      console.log(`Kernel Client: ${kernelClient}`);
      console.log(`Tokens to process: ${tokenBalances.length}`);

      const allTransactions: TransactionRequest[] = [];

      // Get target token (pyUSDC on Arbitrum)
      const targetToken = this.getTargetToken();
      
      console.log(`Processing ${tokenBalances.length} tokens from both chains -> ${targetToken.tokenId}`);

      // Process each token from both Polygon and Arbitrum
      for (const { token, balance, chainId } of tokenBalances) {
        try {
          console.log(`Processing token ${token.tokenId} with balance ${balance} on chain ${chainId}`);

          // Handle different chains
          if (chainId === 137) { // Polygon - bridge to Arbitrum first
            console.log(`Token ${token.tokenId} is on Polygon (chain ${chainId}), bridging to Arbitrum first`);
            
            // For Polygon tokens, we need to bridge them to Arbitrum
            // Create a bridge quote from Polygon to Arbitrum (LiFi will handle token mapping)
            try {
              const bridgeQuote = await this.getBridgeQuote(
                token, // Polygon token
                targetToken, // Bridge directly to pyUSDC on Arbitrum
                balance,
                beneficiaryAddress, // Bridge directly to beneficiary
                userAddress // Sender is the original user
              );

              // Add approval transaction for ERC-20 tokens (non-gas tokens)
              if (!this.isGasToken(token.address)) {
                console.log(`Adding approval transaction for ERC-20 token ${token.tokenId}`);
                
                // Use the approval address from LiFi quote, or use a default spender
                const approvalAddress = bridgeQuote.approvalAddress || '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
                
                const approvalData = this.encodeERC20Approve(approvalAddress, balance);
                
                allTransactions.push({
                  to: token.address,
                  value: BigInt(0),
                  data: approvalData
                });
                
                console.log(`Added approval transaction for ${token.tokenId} to ${approvalAddress}`);
              } else {
                console.log(`Token ${token.tokenId} is gas token, no approval needed`);
              }

              // Add the bridge transaction
              if (bridgeQuote.transactionRequest) {
                allTransactions.push({
                  to: bridgeQuote.transactionRequest.to,
                  value: BigInt(bridgeQuote.transactionRequest.value || '0'),
                  data: bridgeQuote.transactionRequest.data,
                });
                console.log(`Added bridge transaction for ${token.tokenId} from Polygon to Arbitrum`);
              } else {
                console.log(`No bridge transaction available for ${token.tokenId} from Polygon to Arbitrum`);
              }
            } catch (error:any) {
              console.log(`Skipping token ${token.tokenId} - not supported for bridging (${error.message})`);
            }
            continue;
          } else if (chainId !== 42161) { // Not Arbitrum or Polygon
            console.log(`Token ${token.tokenId} is on unsupported chain ${chainId}, skipping`);
            continue;
          }

          // Skip if it's already the target token (pyUSDC)
          if (token.address.toLowerCase() === targetToken.address.toLowerCase()) {
            console.log(`Token ${token.tokenId} is already pyUSDC, skipping`);
            continue;
          }

          // Get swap quote (same chain swap to pyUSDC)
          const quote = await this.getBridgeQuote(
            token,
            targetToken,
            balance,
            beneficiaryAddress, // Swap directly to beneficiary
            userAddress // Sender is the original user
          );

          // Add approval transaction for ERC-20 tokens (non-gas tokens) by default
          if (!this.isGasToken(token.address)) {
            console.log(`Adding approval transaction for ERC-20 token ${token.tokenId}`);
            
            // Use the approval address from LiFi quote, or use a default spender
            const approvalAddress = quote.approvalAddress || '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
            
            // Create ERC-20 approve transaction
            // approve(spender, amount) - ERC-20 standard function
            const approvalData = this.encodeERC20Approve(approvalAddress, balance);
            
            allTransactions.push({
              to: token.address,
              value: BigInt(0),
              data: approvalData
            });
            
            console.log(`Added approval transaction for ${token.tokenId} to ${approvalAddress}`);
          } else {
            console.log(`Token ${token.tokenId} is gas token, no approval needed`);
          }

          // Add the main swap transaction
          if (quote.transactionRequest) {
            allTransactions.push({
              to: quote.transactionRequest.to,
              value: BigInt(quote.transactionRequest.value || '0'),
              data: quote.transactionRequest.data,
            });
          }

        } catch (error) {
          console.error(`Failed to process token ${token.tokenId}:`, error);
          // Continue with other tokens even if one fails
        }
      }

      if (allTransactions.length === 0) {
        console.log('No supported tokens found for bridging - dead hand switch completed with no action needed');
        return [];
      }

      console.log(`Prepared ${allTransactions.length} transactions for user to sign`);
      
      // Return transaction data for user to sign instead of executing
      return {
        transactions: allTransactions,
        message: `Dead hand switch prepared ${allTransactions.length} transactions. Please sign and execute these transactions to complete the bridge.`,
        requiresUserAction: true,
        chainId: 137, // Polygon chain ID
        chainName: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com'
      };

    } catch (error) {
      console.error('Dead hand switch execution failed:', error);
      throw error;
    }
  }

  /**
   * Check if token is native gas token (ETH, MATIC, etc.)
   */
  private isGasToken(tokenAddress: string): boolean {
    const normalizedAddress = tokenAddress.toLowerCase();
    // Common representations of native gas tokens
    const gasTokenAddresses = [
      '0x0000000000000000000000000000000000000000', // Zero address
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // EEE address
      '0x0000000000000000000000000000000000001010', // MATIC on Polygon
    ];
    
    return gasTokenAddresses.includes(normalizedAddress);
  }

  /**
   * Encode ERC-20 approve function call
   * approve(address spender, uint256 amount)
   */
  private encodeERC20Approve(spender: string, amount: string): string {
    // ERC-20 approve function signature: approve(address,uint256)
    const functionSignature = '0x095ea7b3';
    
    // Pad spender address to 32 bytes (remove 0x prefix, pad with zeros)
    const paddedSpender = spender.slice(2).padStart(64, '0');
    
    // Convert amount to hex and pad to 32 bytes
    const amountBigInt = BigInt(amount);
    const paddedAmount = amountBigInt.toString(16).padStart(64, '0');
    
    // Combine function signature + spender + amount
    const encodedData = functionSignature + paddedSpender + paddedAmount;
    
    return encodedData;
  }
}

// Export singleton instance
export const lifiDeadHandService = new LifiDeadHandService();
