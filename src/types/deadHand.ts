export interface Delegation {
  id: number;
  userAddress: string;
  beneficiaryAddress: string;
  kernelClient: string;
  timeout: number;
  isActive: boolean;
  ensName?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  igrisAddress?: string | null;
}

// Keep DeadHandConfig for backward compatibility during transition
export interface DeadHandConfig {
  id: number;
  userAddress: string;
  smartAccount: string;
  timeoutSeconds: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiateDeadHandRequest {
  userAddress: string;
}

export interface InitiateDeadHandResponse {
  status: 'success' | 'error';
  message: string;
  scheduledAt?: string;
  timeoutSeconds?: number;
  error?: string;
}

export interface DeadHandCheckResult {
  type: 'deadhand_check_result';
  userAddress: string;
  aiResponse: string;
  transactionData: any[];
  activityFound: boolean;
  timestamp: string;
}

export interface CronJob {
  id: string;
  userAddress: string;
  scheduledAt: Date;
  timeoutSeconds: number;
  isExecuted: boolean;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface TwitterAuth {
  id: number;
  userAddress: string;
  twitterUserId: string;
  accessToken: string;
  refreshToken: string | null;
  twitterUserName: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TwitterActivity {
  id: string;
  userAddress: string;
  activityType: 'tweet' | 'like' | 'retweet' | 'reply';
  timestamp: Date;
  content: string;
  metadata: {
    tweetId: string;
    authorId: string;
    retweetCount: number;
    likeCount: number;
  };
}

export interface TwitterActivityResult {
  activityFound: boolean;
  activities: TwitterActivity[];
  lastActivity: Date | null;
}
