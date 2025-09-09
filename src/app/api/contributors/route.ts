import {NextRequest, NextResponse} from 'next/server';
import {
    createSuccessJsonResponse,
} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

async function getContributors(currentUser: User, db: PrismaClient, req: NextRequest) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [contributors, total] = await Promise.all([
        db.contributors.findMany({
            where: {
                tenantId: currentUser.tenantId
            },
            select: {
                id: true,
                tenantId: true,
                provider: true,
                name: true,
                providerSpecificId: true,
                accountId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {createdAt: 'desc'},
            skip,
            take: limit,
        }),
        db.contributors.count({
            where: {
                tenantId: currentUser.tenantId
            }
        })
    ]);

    return createSuccessJsonResponse({
        contributors,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    });
}

export const GET = authMiddleware(getContributors);