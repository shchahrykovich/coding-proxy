import 'server-only';
import {NextRequest, NextResponse} from 'next/server';
import { authMiddleware } from '@/infrastructure/middlewares';
import { getAnalyticsQuerySchema, type AnalyticsResponse } from './dtos';
import { PrismaClient, User } from '@prisma/client';
import {getQueryForAllProxiesForUserId} from "@/services/proxy-service";

export async function getAnalytics(
  currentUser: User,
  db: PrismaClient,
  req: NextRequest
) {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { dateRange } = getAnalyticsQuerySchema.parse(queryParams);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const proxies = await db.proxies.findMany({
      where: getQueryForAllProxiesForUserId(currentUser.id, currentUser.tenantId),
      select: { id: true, name: true, totalRequests: true }
    });

    const proxyIds = proxies.map(p => p.id);

    if (proxyIds.length === 0) {
      // Return empty analytics if no proxies
      const emptyResponse: AnalyticsResponse = {
        overview: {
          totalRequests: 0,
          totalProxies: 0,
          totalTokensUsed: 0,
          totalWorkSessions: 0,
          averageRequestsPerDay: 0,
        },
        requestsOverTime: [],
        requestsByProvider: [],
        requestsByClientVersion: [],
        tokenUsage: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          tokensByProvider: [],
        },
        topProxies: [],
        workSessionStats: {
          totalSessions: 0,
          averageTokensPerSession: 0,
          topProjects: [],
        },
        workTypeStats: [],
        modelUsage: {
          totalModels: 0,
          modelStats: [],
          usageByProvider: [],
        },
      };
      return NextResponse.json(emptyResponse);
    }

    // Fetch provider requests within date range
    const providerRequests = await db.providerRequests.findMany({
      where: {
        tenantId: currentUser.tenantId,
        proxyId: { in: proxyIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        provider: true,
        createdAt: true,
        proxyId: true,
        clientVersion: true,
      }
    });

    // Fetch work sessions within date range
    const workSessions = await db.workSessions.findMany({
      where: {
        tenantId: currentUser.tenantId,
        proxyId: { in: proxyIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        totalRequests: {
          gt: 2,
        }
      },
      select: {
        totalInputTokens: true,
        totalOutputTokens: true,
        provider: true,
        project: true,
        analyticsJson: true,
        createdAt: true,
      }
    });

    // Fetch model usages within date range
    const modelUsages = await db.modelUsages.findMany({
      where: {
        tenantId: currentUser.tenantId,
        proxyId: { in: proxyIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        modelName: true,
        inputTokens: true,
        outputTokens: true,
        provider: true,
      }
    });

    // Calculate overview stats
    const totalRequests = providerRequests.length;
    const totalProxies = proxies.length;
    const totalInputTokens = workSessions.reduce((sum, ws) => sum + ws.totalInputTokens, 0);
    const totalOutputTokens = workSessions.reduce((sum, ws) => sum + ws.totalOutputTokens, 0);
    const totalTokensUsed = totalInputTokens + totalOutputTokens;
    const totalWorkSessions = workSessions.length;
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averageRequestsPerDay = Math.round(totalRequests / daysDiff);

    // Calculate requests over time (daily aggregation)
    const requestsOverTime: any[] = [];
    const dailyRequests = new Map<string, number>();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyRequests.set(dateKey, 0);
    }

    providerRequests.forEach(req => {
      const dateKey = req.createdAt.toISOString().split('T')[0];
      dailyRequests.set(dateKey, (dailyRequests.get(dateKey) || 0) + 1);
    });

    Array.from(dailyRequests.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, requests]) => {
        requestsOverTime.push({ date, requests });
      });

    // Calculate requests by provider
    const providerCounts = new Map<string, number>();
    providerRequests.forEach(req => {
      const providerName = req.provider || 'Unknown';
      providerCounts.set(providerName, (providerCounts.get(providerName) || 0) + 1);
    });

    const requestsByProvider = Array.from(providerCounts.entries()).map(([provider, requests]) => ({
      provider,
      requests,
      percentage: Math.round((requests / totalRequests) * 100),
    })).sort((a, b) => b.requests - a.requests);

    // Calculate requests by client version
    const clientVersionCounts = new Map<string, number>();
    providerRequests.forEach(req => {
      const clientVersion = req.clientVersion || 'Unknown';
      clientVersionCounts.set(clientVersion, (clientVersionCounts.get(clientVersion) || 0) + 1);
    });

    const requestsByClientVersion = Array.from(clientVersionCounts.entries()).map(([clientVersion, requests]) => ({
      clientVersion,
      requests,
      percentage: totalRequests > 0 ? Math.round((requests / totalRequests) * 100) : 0,
    })).sort((a, b) => b.requests - a.requests);

    // Calculate token usage by provider
    const tokensByProvider = new Map<string, { input: number; output: number }>();
    workSessions.forEach(ws => {
      const providerName = ws.provider || 'Unknown';
      const current = tokensByProvider.get(providerName) || { input: 0, output: 0 };
      tokensByProvider.set(providerName, {
        input: current.input + ws.totalInputTokens,
        output: current.output + ws.totalOutputTokens,
      });
    });

    const tokenUsageByProvider = Array.from(tokensByProvider.entries()).map(([provider, tokens]) => ({
      provider,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
    }));

    // Calculate top proxies
    const proxyRequestCounts = new Map<number, number>();
    providerRequests.forEach(req => {
      proxyRequestCounts.set(req.proxyId, (proxyRequestCounts.get(req.proxyId) || 0) + 1);
    });

    const topProxies = proxies.map(proxy => ({
      id: proxy.id,
      name: proxy.name,
      requests: proxyRequestCounts.get(proxy.id) || 0,
      percentage: totalRequests > 0 ? Math.round(((proxyRequestCounts.get(proxy.id) || 0) / totalRequests) * 100) : 0,
    })).sort((a, b) => b.requests - a.requests);

    // Calculate work session stats
    const projectCounts = new Map<string, number>();
    workSessions.forEach(ws => {
      if (ws.project && ws.project.trim()) {
        projectCounts.set(ws.project, (projectCounts.get(ws.project) || 0) + 1);
      }
    });

    const topProjects = Array.from(projectCounts.entries())
      .map(([project, sessions]) => ({ project, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    const averageTokensPerSession = totalWorkSessions > 0
      ? Math.round(totalTokensUsed / totalWorkSessions)
      : 0;

    // Calculate work type statistics
    const workTypeCounts = new Map<string, { sessions: number; totalTokens: number }>();

    workSessions.forEach(ws => {
      try {
        const analytics = JSON.parse(ws.analyticsJson || '{}');
        const type = analytics.type || '';

        if (type.trim()) {
          // Split by semicolon and process each work type
          const workTypes = type.split(';').map((t: string) => t.trim()).filter((t: string) => t);
          const sessionTokens = ws.totalInputTokens + ws.totalOutputTokens;

          workTypes.forEach((workType: string) => {
            const current = workTypeCounts.get(workType) || { sessions: 0, totalTokens: 0 };
            // Distribute tokens equally among work types for this session
            const tokensPerType = Math.round(sessionTokens / workTypes.length);
            workTypeCounts.set(workType, {
              sessions: current.sessions + 1,
              totalTokens: current.totalTokens + tokensPerType,
            });
          });
        }
      } catch (e) {
        // Skip if analytics JSON is invalid
      }
    });

    const workTypeStats = Array.from(workTypeCounts.entries())
      .map(([workType, stats]) => ({
        workType,
        sessions: stats.sessions, // Round fractional sessions
        totalTokens: stats.totalTokens,
        percentage: totalWorkSessions > 0 ? Math.round((stats.sessions / totalWorkSessions) * 100) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    // Calculate model usage statistics
    const modelUsageCounts = new Map<string, { inputTokens: number; outputTokens: number; provider: string }>();
    const providerUsageCounts = new Map<string, { inputTokens: number; outputTokens: number; models: Set<string> }>();

    modelUsages.forEach(usage => {
      const modelKey = usage.modelName;
      const providerKey = usage.provider || 'Unknown';
      
      // Track model statistics
      const currentModel = modelUsageCounts.get(modelKey) || { inputTokens: 0, outputTokens: 0, provider: providerKey };
      modelUsageCounts.set(modelKey, {
        inputTokens: currentModel.inputTokens + usage.inputTokens,
        outputTokens: currentModel.outputTokens + usage.outputTokens,
        provider: providerKey,
      });

      // Track provider statistics
      const currentProvider = providerUsageCounts.get(providerKey) || { inputTokens: 0, outputTokens: 0, models: new Set() };
      currentProvider.inputTokens += usage.inputTokens;
      currentProvider.outputTokens += usage.outputTokens;
      currentProvider.models.add(modelKey);
      providerUsageCounts.set(providerKey, currentProvider);
    });

    const totalModelUsage = Array.from(modelUsageCounts.values())
      .reduce((sum, usage) => sum + usage.inputTokens + usage.outputTokens, 0);

    const modelStats = Array.from(modelUsageCounts.entries())
      .map(([modelName, usage]) => {
        const totalUsage = usage.inputTokens + usage.outputTokens;
        return {
          modelName,
          totalUsage,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          percentage: totalModelUsage > 0 ? Math.round((totalUsage / totalModelUsage) * 100) : 0,
          provider: usage.provider,
        };
      })
      .sort((a, b) => b.totalUsage - a.totalUsage);

    const usageByProvider = Array.from(providerUsageCounts.entries())
      .map(([provider, usage]) => ({
        provider,
        totalUsage: usage.inputTokens + usage.outputTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        models: usage.models.size,
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage);

    const response: AnalyticsResponse = {
      overview: {
        totalRequests,
        totalProxies,
        totalTokensUsed,
        totalWorkSessions,
        averageRequestsPerDay,
      },
      requestsOverTime,
      requestsByProvider,
      requestsByClientVersion,
      tokenUsage: {
        totalInputTokens,
        totalOutputTokens,
        tokensByProvider: tokenUsageByProvider,
      },
      topProxies,
      workSessionStats: {
        totalSessions: totalWorkSessions,
        averageTokensPerSession,
        topProjects,
      },
      workTypeStats,
      modelUsage: {
        totalModels: modelUsageCounts.size,
        modelStats,
        usageByProvider,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export const GET = authMiddleware(getAnalytics);
