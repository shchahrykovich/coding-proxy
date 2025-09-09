import {NextRequest, NextResponse} from 'next/server';
import {getBucket} from '@/lib/utils';
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

async function getMessages(user: User,
                           db: PrismaClient,
                           request: NextRequest,
                           {params}: { params: Promise<{ id: string }> }) {
    const sessionId = parseInt((await params).id);
    if (isNaN(sessionId)) {
        return NextResponse.json({error: 'Invalid session ID'}, {status: 400});
    }

    // Verify work session exists and belongs to user's tenant
    const workSession = await db.workSessions.findFirst({
        where: {
            id: sessionId,
            tenantId: user.tenantId
        },
        select: {
            id: true,
            createdAt: true,
            tenantId: true
        }
    });

    if (!workSession) {
        return NextResponse.json({error: 'Work session not found'}, {status: 404});
    }

    const bucket = await getBucket();
    const requestDate = workSession.createdAt.toISOString().substring(0, 10);
    const combinedPath = `work-sessions/${user.tenantId}/${sessionId}/${requestDate}/combined.json`;

    try {
        const combinedObj = await bucket.get(combinedPath);
        if (!combinedObj) {
            return NextResponse.json({error: 'Combined messages not found'}, {status: 404});
        }

        const combinedText = await combinedObj.text();
        const combinedData = JSON.parse(combinedText);

        return NextResponse.json(combinedData);
    } catch (bucketError) {
        console.error(`Error reading combined messages from bucket:`, bucketError);
        return NextResponse.json({error: 'Failed to retrieve messages'}, {status: 500});
    }
}

export const GET = authMiddleware(getMessages);
