import {NextRequest} from 'next/server';
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

async function getProjects(currentUser: User, db: PrismaClient, req: NextRequest) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
        db.projects.findMany({
            where: {
                tenantId: currentUser.tenantId
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                totalRequests: true,
                totalInputTokens: true,
                totalOutputTokens: true,
            },
            orderBy: {createdAt: 'desc'},
            skip,
            take: limit,
        }),
        db.projects.count({
            where: {
                tenantId: currentUser.tenantId
            }
        })
    ]);

    // Get memory records count for each project
    const projectIds = projects.map(p => p.id);
    const memoryRecordsCounts = await db.memoryRecords.groupBy({
        by: ['projectId'],
        where: {
            tenantId: currentUser.tenantId,
            projectId: { in: projectIds }
        },
        _count: {
            id: true
        }
    });

    const memoryCountMap = new Map(memoryRecordsCounts.map(m => [m.projectId, m._count.id]));

    const projectsWithMemoryCount = projects.map((project) => ({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        totalRequests: project.totalRequests,
        totalInputTokens: project.totalInputTokens,
        totalOutputTokens: project.totalOutputTokens,
        memoryRecordsCount: memoryCountMap.get(project.id) || 0
    }));

    return createSuccessJsonResponse({
        projects: projectsWithMemoryCount,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    });
}

export const GET = authMiddleware(getProjects);