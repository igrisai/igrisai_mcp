import { z } from 'zod';

export const SocialActivityQuerySchema = z.object({
  platform: z.enum(['twitter', 'telegram', 'discord', 'reddit']),
  username: z.string().min(1),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
});

export const OnChainQuerySchema = z.object({
  address: z.string().min(1),
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base']).optional().default('ethereum'),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  transactionType: z.enum(['swap', 'transfer', 'mint', 'burn', 'all']).optional().default('all'),
});

export const TokenAnalysisSchema = z.object({
  tokenAddress: z.string().min(1),
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base']).optional().default('ethereum'),
  includeSocial: z.boolean().optional().default(true),
  includeOnChain: z.boolean().optional().default(true),
});

export const PortfolioAnalysisSchema = z.object({
  addresses: z.array(z.string()).min(1),
  chains: z.array(z.enum(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'])).optional(),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
});
