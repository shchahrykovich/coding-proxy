import {NextRequest, NextResponse} from 'next/server';
import {getQueryForAllProxiesForUser} from "@/services/proxy-service";
import {authMiddleware} from "@/infrastructure/middlewares";
import {PrismaClient, User} from "@prisma/client";

async function getProxy(user: User,
                        db: PrismaClient,
                        request: NextRequest,
                        {params}: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    const proxyId = parseInt(id);

    const proxy = await db.proxies.findFirst({
        where: {
            id: proxyId,
            ...(getQueryForAllProxiesForUser(user)),
        },
        select: {
            id: true,
            tenantId: true,
            userId: true,
            apiKey: true,
            totalRequests: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!proxy) {
        return NextResponse.json({error: 'Proxy not found'}, {status: 404});
    }

    // Get requests for this proxy
    const requests = await db.providerRequests.findMany({
        where: {proxyId: proxyId},
        select: {
            id: true,
            provider: true,
            generatedId: true,
            receivedAt: true,
            createdAt: true
        },
        orderBy: {receivedAt: 'desc'},
        take: 100 // Limit to latest 100 requests
    });

    return NextResponse.json({
        proxy,
        requests
    });
}

export const GET = authMiddleware(getProxy);

async function deleteProxy(currentUser: User,
                           db: PrismaClient,
                           request: NextRequest,
                           {params}: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    const proxyId = parseInt(id);

    const proxyToDelete = await db.proxies.findUnique({
        where: {id: proxyId, tenantId: currentUser.tenantId},
        select: {id: true, tenantId: true, apiKey: true, userId: true}
    });

    if (!proxyToDelete) {
        return NextResponse.json({error: 'Proxy not found'}, {status: 404});
    }

    // Additional check: only allow deletion if the proxy belongs to the user or is a tenant-wide proxy
    const canDelete = proxyToDelete.userId === currentUser.id || proxyToDelete.userId === null;

    if (!canDelete) {
        return NextResponse.json({
            error: 'Forbidden: Cannot delete proxy belonging to another user'
        }, {status: 403});
    }

    // Delete related records first (if any)
    // Delete work sessions associated with this proxy
    await db.workSessions.deleteMany({
        where: {proxyId: proxyId, tenantId: currentUser.tenantId}
    });

    // Delete provider requests associated with this proxy
    await db.providerRequests.deleteMany({
        where: {proxyId: proxyId, tenantId: currentUser.tenantId}
    });

    // Delete the proxy
    await db.proxies.delete({
        where: {id: proxyId, tenantId: currentUser.tenantId}
    });

    return NextResponse.json({
        message: 'Proxy deleted successfully',
        deletedProxy: {
            id: proxyToDelete.id,
            apiKey: proxyToDelete.apiKey.substring(0, 20) + '...'
        }
    });
}

export const DELETE = authMiddleware(deleteProxy);
