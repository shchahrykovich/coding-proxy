import {Prisma, PrismaClient, User} from "@prisma/client";
import {generateSecureApiKey} from "@/lib/proxy-keys";

export function getQueryForAllProxiesForUser(user: User): Prisma.ProxiesWhereInput {
    return getQueryForAllProxiesForUserId(user.id, user.tenantId);
}

export function getQueryForAllProxiesForUserId(userId: string, tenantId: number): Prisma.ProxiesWhereInput {
    return {
        tenantId: tenantId,
        OR: [
            {userId: userId},
            {userId: null}
        ]
    } as Prisma.ProxiesWhereInput;
}


export async function createProxyForTenant(db: PrismaClient, name: string, tenantId: number) {
    const apiKey = generateSecureApiKey();

    const newProxy = await db.proxies.create({
        data: {
            tenantId: tenantId,
            name: name,
            apiKey: apiKey,
        },
        select: {
            id: true,
            tenantId: true,
            name: true,
            userId: true,
            apiKey: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return newProxy;
}
