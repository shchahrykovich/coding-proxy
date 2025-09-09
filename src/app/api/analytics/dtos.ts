import { z } from 'zod';

export const getAnalyticsQuerySchema = z.object({
  dateRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  proxyId: z.string().optional(),
});

export type GetAnalyticsQuery = z.infer<typeof getAnalyticsQuerySchema>;

export interface AnalyticsResponse {
  overview: {
    totalRequests: number;
    totalProxies: number;
    totalTokensUsed: number;
    totalWorkSessions: number;
    averageRequestsPerDay: number;
  };
  requestsOverTime: Array<{
    date: string;
    requests: number;
  }>;
  requestsByProvider: Array<{
    provider: string;
    requests: number;
    percentage: number;
  }>;
  requestsByClientVersion: Array<{
    clientVersion: string;
    requests: number;
    percentage: number;
  }>;
  tokenUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    tokensByProvider: Array<{
      provider: string;
      inputTokens: number;
      outputTokens: number;
    }>;
  };
  topProxies: Array<{
    id: number;
    name: string | null;
    requests: number;
    percentage: number;
  }>;
  workSessionStats: {
    totalSessions: number;
    averageTokensPerSession: number;
    topProjects: Array<{
      project: string;
      sessions: number;
    }>;
  };
  workTypeStats?: Array<{
    workType: string;
    sessions: number;
    totalTokens: number;
    percentage: number;
  }>;
  modelUsage: {
    totalModels: number;
    modelStats: Array<{
      modelName: string;
      totalUsage: number;
      inputTokens: number;
      outputTokens: number;
      percentage: number;
      provider: string;
    }>;
    usageByProvider: Array<{
      provider: string;
      totalUsage: number;
      inputTokens: number;
      outputTokens: number;
      models: number;
    }>;
  };
}
