import {NextRequest} from 'next/server';
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";
import {getQueryForAvailableWorkSessions} from "@/services/work-session-service";

async function getContributorSessions(currentUser: User, db: PrismaClient, req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const contributorId = parseInt(id);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // First verify the contributor exists and belongs to current tenant
    const contributor = await db.contributors.findFirst({
        where: {
            id: contributorId,
            tenantId: currentUser.tenantId
        }
    });

    if (!contributor) {
        return createSuccessJsonResponse({ sessions: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const [sessions, total] = await Promise.all([
        db.workSessions.findMany({
            where: {
                contributorId: contributorId,
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
                totalOutputTokens: true
            },
            orderBy: { lastReceivedRequestAt: 'desc' },
            skip,
            take: limit,
        }),
        db.workSessions.count({
            where: {
                contributorId: contributorId,
                tenantId: currentUser.tenantId
            }
        })
    ]);

    const sessionsWithRequestCount = await Promise.all(
        sessions.map(async (session) => {
            const requestCount = await db.providerRequests.count({
                where: {
                    workSessionId: session.id,
                    tenantId: currentUser.tenantId
                }
            });

            return {
                id: session.id,
                name: session.providerSpecificId,
                provider: session.provider,
                contributorId: session.contributorId,
                accountId: session.accountId,
                analytics: JSON.parse(session.analyticsJson),
                requestCount,
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
        contributor,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    });
}

export const GET = authMiddleware(getContributorSessions);
