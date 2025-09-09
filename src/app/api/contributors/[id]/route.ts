import {NextRequest, NextResponse} from 'next/server';
import * as zod from 'zod';
import {
    createSuccessJsonResponse,
} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

const UpdateContributorSchema = zod.object({
    name: zod.string().min(1, "Name is required").max(100, "Name is too long"),
});

async function updateContributor(currentUser: User, db: PrismaClient, req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const contributorId = parseInt(id);
    const body = await req.json();
    const { name } = UpdateContributorSchema.parse(body);

    // Verify the contributor exists and belongs to current tenant
    const existingContributor = await db.contributors.findFirst({
        where: {
            id: contributorId,
            tenantId: currentUser.tenantId
        }
    });

    if (!existingContributor) {
        return NextResponse.json({error: 'Contributor not found'}, {status: 404});
    }

    // Update the contributor
    const updatedContributor = await db.contributors.update({
        where: {
            id: contributorId,
            tenantId: currentUser.tenantId
        },
        data: {
            name,
            updatedAt: new Date()
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
        }
    });

    return createSuccessJsonResponse(updatedContributor);
}

export const PUT = authMiddleware(updateContributor);
