import axios from 'axios';
import { GraphQueryResult, SocialActivityData, OnChainTransaction } from '../types/index.js';
import { SocialActivityQuerySchema, OnChainQuerySchema } from '../types/schemas.js';
import { mcpConfig, graphSubgraphs, socialPlatforms } from '../config/index.js';

export class GraphMCPTools {
  private openrouterApiKey: string;
  private graphApiKey: string;

  constructor() {
    this.openrouterApiKey = mcpConfig.openrouter.apiKey;
    this.graphApiKey = mcpConfig.graph.apiKey;
  }

  /**
   * Query social activity data from various platforms
   */
  async querySocialActivity(params: any): Promise<SocialActivityData[]> {
    const validatedParams = SocialActivityQuerySchema.parse(params);
    const { platform, username, timeframe } = validatedParams;

    try {
      const platformConfig = socialPlatforms[platform];
      if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // This is a simplified implementation - in practice, you'd need proper API keys
      // and authentication for each platform
      const mockData: SocialActivityData = {
        platform,
        username,
        activity: {
          posts: Math.floor(Math.random() * 100),
          followers: Math.floor(Math.random() * 10000),
          engagement: Math.floor(Math.random() * 1000),
          sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as any,
        },
        timestamp: new Date().toISOString(),
      };

      return [mockData];
    } catch (error) {
      throw new Error(`Failed to query social activity: ${error}`);
    }
  }

  /**
   * Query on-chain transaction data using The Graph
   */
  async queryOnChainTransactions(params: any): Promise<OnChainTransaction[]> {
    const validatedParams = OnChainQuerySchema.parse(params);
    const { address, chain, timeframe, transactionType } = validatedParams;

    try {
      const subgraphUrl = this.getSubgraphUrl(chain);
      if (!subgraphUrl) {
        throw new Error(`No subgraph available for chain: ${chain}`);
      }

      // GraphQL query for Uniswap V3 swaps
      const query = `
        query GetSwaps($address: String!, $first: Int!) {
          swaps(
            where: { 
              or: [
                { sender: $address },
                { recipient: $address }
              ]
            }
            first: $first
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            transaction {
              id
              timestamp
            }
            sender
            recipient
            amount0
            amount1
            token0 {
              symbol
              decimals
            }
            token1 {
              symbol
              decimals
            }
          }
        }
      `;

      const response = await axios.post(subgraphUrl, {
        query,
        variables: {
          address: address.toLowerCase(),
          first: 100,
        },
      });

      const result: GraphQueryResult = response.data;
      
      if (result.errors) {
        throw new Error(`Graph query errors: ${JSON.stringify(result.errors)}`);
      }

      // Transform GraphQL response to our transaction format
      const transactions: OnChainTransaction[] = result.data.swaps.map((swap: any) => ({
        hash: swap.transaction.id,
        from: swap.sender,
        to: swap.recipient,
        value: swap.amount0,
        token: swap.token0.symbol,
        chain,
        timestamp: new Date(parseInt(swap.transaction.timestamp) * 1000).toISOString(),
        type: 'swap' as const,
      }));

      return transactions;
    } catch (error) {
      throw new Error(`Failed to query on-chain transactions: ${error}`);
    }
  }

  /**
   * Analyze token performance combining social and on-chain data
   */
  async analyzeTokenPerformance(params: any): Promise<any> {
    const { tokenAddress, chain, includeSocial, includeOnChain } = params;

    try {
      const results: any = {
        tokenAddress,
        chain,
        timestamp: new Date().toISOString(),
      };

      if (includeOnChain) {
        // Query token transactions
        const transactions = await this.queryOnChainTransactions({
          address: tokenAddress,
          chain,
          timeframe: '24h',
        });
        results.onChainData = {
          totalTransactions: transactions.length,
          totalVolume: transactions.reduce((sum, tx) => sum + parseFloat(tx.value), 0),
          transactions,
        };
      }

      if (includeSocial) {
        // Query social mentions (simplified)
        results.socialData = {
          mentions: Math.floor(Math.random() * 1000),
          sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
          platforms: ['twitter', 'telegram', 'discord'],
        };
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to analyze token performance: ${error}`);
    }
  }

  /**
   * Get portfolio analysis for multiple addresses
   */
  async analyzePortfolio(params: any): Promise<any> {
    const { addresses, chains, timeframe } = params;

    try {
      const portfolioData: any = {
        addresses,
        chains: chains || ['ethereum'],
        timeframe,
        timestamp: new Date().toISOString(),
        analysis: [],
      };

      for (const address of addresses) {
        for (const chain of portfolioData.chains) {
          const transactions = await this.queryOnChainTransactions({
            address,
            chain,
            timeframe,
          });

          portfolioData.analysis.push({
            address,
            chain,
            transactionCount: transactions.length,
            totalVolume: transactions.reduce((sum, tx) => sum + parseFloat(tx.value), 0),
            transactions,
          });
        }
      }

      return portfolioData;
    } catch (error) {
      throw new Error(`Failed to analyze portfolio: ${error}`);
    }
  }

  private getSubgraphUrl(chain: string): string | null {
    const chainSubgraphs = graphSubgraphs[chain as keyof typeof graphSubgraphs];
    if (!chainSubgraphs) return null;

    // Default to Uniswap subgraph if available, otherwise use the first available subgraph
    const subgraphName = 'uniswap' in chainSubgraphs 
      ? chainSubgraphs.uniswap 
      : Object.values(chainSubgraphs)[0];
    
    if (!subgraphName) return null;

    return `${mcpConfig.graph.baseUrl}/${subgraphName}`;
  }
}
