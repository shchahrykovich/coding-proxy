import 'server-only'
import {NextRequest, NextResponse} from "next/server";
import {auth} from "@/app/auth";
import {getDB} from "@/lib/utils";
import {PrismaClient, User} from "@prisma/client";
import {createErrorResponse} from "@/infrastructure/api-requests";
import {loggingStore} from "@/infrastructure/logging";
import {v7 as uuidv7} from "uuid";

export type AuthHandlerWithParams<T, P = unknown> = (currentUser: User,
                                                     db: PrismaClient,
                                                     req: NextRequest,
                                                     {params}: { params: Promise<P> }) => Promise<T>;

export function authMiddleware<T, P>(handler: AuthHandlerWithParams<T, P>) {
    return async (req: NextRequest, {params}: { params: Promise<P> }) => {
        let currentUser: User | null = null;

        try {
            const session = await auth();
            if (!session?.user?.id) {
                return NextResponse.json({error: 'Unauthorized'}, {status: 401});
            }

            const db = await getDB();

            currentUser = await db.user.findUnique({
                where: {id: session.user.id},
            }) as User;

            if (!currentUser) {
                return NextResponse.json({error: 'User not found'}, {status: 404});
            }

            return loggingStore.run({
                userId: currentUser?.id,
                tenantId: currentUser?.tenantId,
                method: req.method,
                url: req.url,
                reqId: uuidv7(),
            }, () => {
                return handler(currentUser!, db, req, {params});
            });
        } catch (error) {
            return createErrorResponse(error, 'generic_error');
        }
    }
}
