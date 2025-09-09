import {NextRequest} from 'next/server';
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";
import {getQueryForAvailableWorkSessions} from "@/services/work-session-service";

async function getAllSessions(currentUser: User, db: PrismaClient, req: NextRequest) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
        db.workSessions.findMany({
            where: {
                ...(getQueryForAvailableWorkSessions(currentUser.tenantId))
            },
            select: {
                id: true,
                provider: true,
                providerSpecificId: true,
                contributorId: true,
                accountId: true,
                createdAt: true,
                updatedAt: true,
                lastReceivedRequestAt: true,
                analyticsJson: true,
                title: true,
                project: true,
                totalInputTokens: true,
                totalOutputTokens: true,
                totalRequests: true
            },
            orderBy: {lastReceivedRequestAt: 'desc'},
            skip,
            take: limit,
        }),
        db.workSessions.count({
            where: {
                tenantId: currentUser.tenantId,
                totalRequests: {
                    gt: 2
                }
            }
        })
    ]);

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

    const sessionsWithRequestCount = await Promise.all(
        sessions.map(async (session) => {
            const contributor = contributorMap.get(session.contributorId);

            return {
                id: session.id,
                name: session.providerSpecificId,
                provider: session.provider,
                contributorId: session.contributorId,
                contributorName: contributor?.name || 'Unknown',
                contributorProvider: contributor?.provider || session.provider,
                accountId: session.accountId,
                totalRequests: session.totalRequests,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                lastReceivedRequestAt: session.lastReceivedRequestAt,
                title: session.title,
                project: session.project,
                totalInputTokens: session.totalInputTokens,
                totalOutputTokens: session.totalOutputTokens
            };
        })
    );

    return createSuccessJsonResponse({
        sessions: sessionsWithRequestCount,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    });
}

export const GET = authMiddleware(getAllSessions);
