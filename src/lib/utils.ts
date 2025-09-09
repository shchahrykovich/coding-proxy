import {getCloudflareContext} from "@opennextjs/cloudflare";
import {PrismaD1} from "@prisma/adapter-d1";
import {PrismaClient} from "@prisma/client";

export interface ServerEnv {
    DB: D1Database;
    PRIVATE_FILES: R2Bucket;
    QUEUE_NEW_REQUESTS: Queue;
}

export async function getServerContext() {
    return await getCloudflareContext({async: true});
}

export async function getDB() {
    const context = await getServerContext();
    const env = context.env as unknown as ServerEnv;
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({adapter})

    return prisma;
}


export async function getBucket(): Promise<R2Bucket> {
    const context = await getServerContext();
    const env = context.env as unknown as ServerEnv;

    return env.PRIVATE_FILES;
}


export async function getQueueForNewRequests(): Promise<Queue> {
    const context = await getServerContext();
    const env = context.env as unknown as ServerEnv;

    return env.QUEUE_NEW_REQUESTS;
}
