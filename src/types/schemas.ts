import { z } from 'zod';

export const TokenAnalysisSchema = z.object({
  tokenAddress: z.string().min(1),
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base']).optional().default('ethereum'),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
});

export const TokenInsightsSchema = z.object({
  transferData: z.object({
    totalTransfers: z.number(),
    uniqueAddresses: z.number(),
    totalVolume: z.string(),
    averageTransferSize: z.string().optional(),
    topSenders: z.array(z.string()).optional(),
    topReceivers: z.array(z.string()).optional(),
  }),
  swapData: z.object({
    totalSwaps: z.number(),
    averagePrice: z.string(),
    priceChange: z.string(),
    totalVolume: z.string(),
    liquidityChanges: z.string().optional(),
  }),
  analysisType: z.enum(['comprehensive', 'trading', 'sentiment']).optional().default('comprehensive'),
});
