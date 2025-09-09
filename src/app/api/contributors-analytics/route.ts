import {NextRequest} from 'next/server';
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";
import {getQueryForAvailableWorkSessions} from "@/services/work-session-service";

interface ContributorAnalytics {
    id: number;
    name: string;
    provider: string;
    totalSessions: number;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    lastActivity: string | null;
    averageTokensPerSession: number;
    sessionsOverTime: { date: string; sessions: number }[];
}

async function getContributorAnalytics(currentUser: User, db: PrismaClient, req: NextRequest) {
    const url = new URL(req.url);
    const dateRange = url.searchParams.get('dateRange') || '30d';

    // Calculate date filter
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setDate(now.getDate() - 30);
    }

    // Get all contributors for the tenant
    const contributors = await db.contributors.findMany({
        where: {
            tenantId: currentUser.tenantId
        },
        select: {
            id: true,
            name: true,
            provider: true,
            createdAt: true,
            updatedAt: true
        }
    });

    const contributorAnalytics: ContributorAnalytics[] = await Promise.all(
        contributors.map(async (contributor) => {
            // Get sessions for this contributor within date range
            const sessions = await db.workSessions.findMany({
                where: {
                    contributorId: contributor.id,
                    lastReceivedRequestAt: {
                        gte: startDate
                    },
                    ...(getQueryForAvailableWorkSessions(currentUser.tenantId))
                },
                select: {
                    id: true,
                    totalInputTokens: true,
                    totalOutputTokens: true,
                    lastReceivedRequestAt: true,
                    createdAt: true
                }
            });

            // Get total request count for this contributor
            const totalRequests = await db.providerRequests.count({
                where: {
                    contributorId: contributor.id,
                    tenantId: currentUser.tenantId,
                    receivedAt: {
                        gte: startDate
                    }
                }
            });

            // Calculate totals
            const totalInputTokens = sessions.reduce((sum, s) => sum + s.totalInputTokens, 0);
            const totalOutputTokens = sessions.reduce((sum, s) => sum + s.totalOutputTokens, 0);
            const totalTokens = totalInputTokens + totalOutputTokens;
            const totalSessions = sessions.length;

            // Calculate average tokens per session
            const averageTokensPerSession = totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;

            // Get last activity
            const lastActivity = sessions.length > 0
                ? sessions.reduce((latest, session) => {
                    const sessionDate = new Date(session.lastReceivedRequestAt);
                    return sessionDate > latest ? sessionDate : latest;
                }, new Date(sessions[0].lastReceivedRequestAt)).toISOString()
                : null;

            // Generate sessions over time data (daily for last period)
            const sessionsOverTime: { date: string; sessions: number }[] = [];
            const days = Math.min(parseInt(dateRange.replace('d', '')) || 30, 30); // Max 30 days for detailed view

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(now.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const sessionsOnDate = sessions.filter(session => {
                    const sessionDate = new Date(session.lastReceivedRequestAt);
                    return sessionDate.toISOString().split('T')[0] === dateStr;
                }).length;

                sessionsOverTime.push({
                    date: dateStr,
                    sessions: sessionsOnDate
                });
            }

            return {
                id: contributor.id,
                name: contributor.name,
                provider: contributor.provider,
                totalSessions,
                totalRequests,
                totalInputTokens,
                totalOutputTokens,
                totalTokens,
                lastActivity,
                averageTokensPerSession,
                sessionsOverTime
            };
        })
    );

    // Sort by total tokens descending
    contributorAnalytics.sort((a, b) => b.totalTokens - a.totalTokens);

    return createSuccessJsonResponse({
        contributors: contributorAnalytics,
        summary: {
            totalContributors: contributors.length,
            totalActiveContributors: contributorAnalytics.filter(c => c.totalSessions > 0).length,
            totalSessions: contributorAnalytics.reduce((sum, c) => sum + c.totalSessions, 0),
            totalRequests: contributorAnalytics.reduce((sum, c) => sum + c.totalRequests, 0),
            totalTokens: contributorAnalytics.reduce((sum, c) => sum + c.totalTokens, 0)
        }
    });
}

export const GET = authMiddleware(getContributorAnalytics);
