import {NextRequest, NextResponse} from 'next/server';
import {getQueueForNewRequests} from '@/lib/utils';
import {UpdateWorkSessionMessage} from "@/lib/queue-messages";
import {sendUpdateSession} from "@/lib/queue-sender";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

async function getSession(currentUser: User,
                          db: PrismaClient,
                          request: NextRequest,
                          {params}: { params: Promise<{ id: string }> }) {
    const sessionId = parseInt((await params).id);
    if (isNaN(sessionId)) {
        return NextResponse.json({error: 'Invalid session ID'}, {status: 400});
    }

    // Get work session details
    const workSession = await db.workSessions.findFirst({
        where: {
            id: sessionId,
            tenantId: currentUser.tenantId
        },
        select: {
            id: true,
            provider: true,
            providerSpecificId: true,
            contributorId: true,
            accountId: true,
            analyticsJson: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!workSession) {
        return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    // Get request count for the session
    const requestCount = await db.providerRequests.count({
        where: {
            workSessionId: sessionId,
            tenantId: currentUser.tenantId
        }
    });

    const responseData = {
        id: workSession.id,
        name: workSession.providerSpecificId,
        provider: workSession.provider,
        contributorId: workSession.contributorId,
        accountId: workSession.accountId,
        analytics: JSON.parse(workSession.analyticsJson),
        requestCount,
        createdAt: workSession.createdAt,
        updatedAt: workSession.updatedAt
    };

    return NextResponse.json(responseData);
}

export const GET = authMiddleware(getSession);

async function updateSession(user: User,
                             db: PrismaClient,
                             request: NextRequest,
                             {params}: { params: Promise<{ id: string }> }) {
    const sessionId = parseInt((await params).id);
    if (isNaN(sessionId)) {
        return NextResponse.json({error: 'Invalid session ID'}, {status: 400});
    }

    // Verify the session belongs to the user's tenant
    const workSession = await db.workSessions.findFirst({
        where: {
            id: sessionId,
            tenantId: user.tenantId
        }
    });

    if (!workSession) {
        return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    // Update the session's updatedAt timestamp to trigger re-processing
    const updatedSession = await db.workSessions.update({
        where: {id: sessionId, tenantId: user.tenantId},
        data: {
            updatedAt: new Date()
        },
        select: {
            id: true,
            provider: true,
            providerSpecificId: true,
            contributorId: true,
            accountId: true,
            analyticsJson: true,
            createdAt: true,
            updatedAt: true
        }
    });

    // Create update work session message
    const updateMessage: UpdateWorkSessionMessage = {
        type: 'update-session',
        tenantId: user.tenantId,
        sessionId: workSession.id,
        provider: workSession.provider
    };

    // Send queue message
    const queue = await getQueueForNewRequests();
    await sendUpdateSession(queue, updateMessage, 0);

    // Get request count for the session
    const requestCount = await db.providerRequests.count({
        where: {
            workSessionId: sessionId,
            tenantId: user.tenantId
        }
    });

    const responseData = {
        id: updatedSession.id,
        name: updatedSession.providerSpecificId,
        provider: updatedSession.provider,
        contributorId: updatedSession.contributorId,
        accountId: updatedSession.accountId,
        analytics: JSON.parse(updatedSession.analyticsJson),
        requestCount,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt
    };

    return NextResponse.json(responseData);
}


export const PUT = authMiddleware(updateSession);
