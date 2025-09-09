import { NextRequest } from 'next/server';
import { generateSecureApiKey } from '@/lib/proxy-keys';
import * as zod from 'zod';
import {PrismaClient, User} from "@prisma/client";
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";
import {authMiddleware} from "@/infrastructure/middlewares";
import {createProxyForTenant, getQueryForAllProxiesForUser} from "@/services/proxy-service";

const CreateProxySchema = zod.object({
  tenantId: zod.number().optional(),
  name: zod.string().max(100).optional().nullable(),
});

async function getAllProxies(user: User, db: PrismaClient) {
  const proxies = await db.proxies.findMany({
    where: getQueryForAllProxiesForUser(user),
    select: {
      id: true,
      tenantId: true,
      name: true,
      userId: true,
      apiKey: true,
      createdAt: true,
      updatedAt: true,
      totalRequests: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return createSuccessJsonResponse(proxies);
}

export const GET = authMiddleware(getAllProxies);

async function createProxy(user: User, db: PrismaClient, request: NextRequest) {
  const body = await request.json();
  const { name } = CreateProxySchema.parse(body);

  const newProxy = await createProxyForTenant(db, name || 'Default', user.tenantId);

  return createSuccessJsonResponse(newProxy, 201);
}

export const POST = authMiddleware(createProxy);
