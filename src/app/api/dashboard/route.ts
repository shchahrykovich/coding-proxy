import {authMiddleware} from "@/infrastructure/middlewares";
import {PrismaClient, User} from "@prisma/client";
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {getQueryForAvailableWorkSessions} from "@/services/work-session-service";

async function getDashboardData(currentUser: User, db: PrismaClient) {
    const sessions = await db.workSessions.findMany({
        where: {
            ...(getQueryForAvailableWorkSessions(currentUser.tenantId))
        },
        select: {
            id: true,
            provider: true,
            contributorId: true,
            createdAt: true,
            updatedAt: true,
            totalRequests: true,
            lastReceivedRequestAt: true,
            project: true,
            title: true,
            totalInputTokens: true,
            totalOutputTokens: true
        },
        orderBy: {lastReceivedRequestAt: 'desc'},
    });

    // Get contributor information for all sessions
    const contributorIds = [...new Set(sessions.map(s => s.contributorId))];
    const contributors = await db.contributors.findMany({
        where: {
            id: { in: contributorIds },
            tenantId: currentUser.tenantId
        },
        select: {
            id: true,
            name: true,
            provider: true
        }
    });

    const contributorMap = new Map(contributors.map(c => [c.id, c]));

    return createSuccessJsonResponse({
        sessions: sessions.map(s => {
            const contributor = contributorMap.get(s.contributorId);
            return {
                ...s,
                contributorName: contributor?.name || 'Unknown',
            };
        }),
    });
}

export const GET = authMiddleware(getDashboardData);
