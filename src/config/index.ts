import dotenv from 'dotenv';
dotenv.config();
import { MCPConfig } from '../types/index.js';

export const mcpConfig: MCPConfig = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen3-14b',
  },
};