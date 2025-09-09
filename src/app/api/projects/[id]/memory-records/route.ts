import {NextRequest} from 'next/server';
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";
import {getServerContext} from "@/lib/utils";

async function getMemoryRecords(currentUser: User,
                                db: PrismaClient,
                                request: NextRequest,
                                {params}: { params: Promise<{ id: string }> }) {
    const projectId = parseInt((await params).id);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // First verify the project belongs to the current user's tenant
    const project = await db.projects.findFirst({
        where: {
            id: projectId,
            tenantId: currentUser.tenantId
        }
    });

    if (!project) {
        return new Response(JSON.stringify({ error: 'Project not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let memoryRecords: any[] = [];
    let total = 0;
    if (search) {
        const env = await getServerContext();
        const selectCount = `
            SELECT COUNT(*) as count
            FROM MemoryRecordsForSearch
            WHERE tenantId = ?
              AND projectId = ?
              AND MemoryRecordsForSearch MATCH ?;
        `;
        const count: {results: {count: number}[] } = await env.env.DB.prepare(selectCount).bind(currentUser.tenantId, projectId, search).all();
        if (count.results) {
            total = count.results[0].count || 0;
        }
        if (total) {
            const selectPage = `
                SELECT title, body, createdAt, recordId as id, workSessionId
                FROM MemoryRecordsForSearch
                WHERE tenantId = ?
                  AND projectId = ?
                  AND MemoryRecordsForSearch MATCH ?
                ORDER BY createdAt DESC
                    LIMIT ?
                OFFSET ?;
            `;
            const pageToReturn = await env.env.DB.prepare(selectPage).bind(currentUser.tenantId, projectId, search, limit, skip).all();
            memoryRecords = pageToReturn.results;
        }
    }
    else {
        [memoryRecords, total] = await Promise.all([
            db.memoryRecords.findMany({
                where: {
                    tenantId: currentUser.tenantId,
                    projectId: projectId,
                },
                select: {
                    id: true,
                    title: true,
                    body: true,
                    createdAt: true,
                    workSessionId: true,
                },
                orderBy: {createdAt: 'desc'},
                skip,
                take: limit,
            }),
            db.memoryRecords.count({
                where: {
                    tenantId: currentUser.tenantId,
                    projectId: projectId,
                }
            })
        ]);

    }

    return createSuccessJsonResponse({
        project: {
            id: project.id,
            name: project.name
        },
        memoryRecords,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    });
}

export const GET = authMiddleware(getMemoryRecords);
