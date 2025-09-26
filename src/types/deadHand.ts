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
