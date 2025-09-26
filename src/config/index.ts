import dotenv from 'dotenv';
dotenv.config();
import { MCPConfig } from '../types/index.js';

export const mcpConfig: MCPConfig = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'x-ai/grok-4-fast',
  },
};