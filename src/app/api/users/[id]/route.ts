import {NextRequest, NextResponse} from 'next/server';
import {auth} from '@/app/auth';
import {getDB} from '@/lib/utils';
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

async function deleteUser(currentUser: User,
                          db: PrismaClient,
                          request: NextRequest,
                          {params}: { params: Promise<{ id: string }> }) {
    const {id} = await params;

    // Check if the user to delete exists and belongs to the same tenant
    const userToDelete = await db.user.findUnique({
        where: {id, tenantId: currentUser.tenantId},
        select: {id: true, tenantId: true, email: true}
    });

    if (!userToDelete) {
        return NextResponse.json({error: 'User not found'}, {status: 404});
    }

    if (userToDelete.tenantId !== currentUser.tenantId) {
        return NextResponse.json({
            error: 'Forbidden: Cannot delete user from different tenant'
        }, {status: 403});
    }

    // Prevent users from deleting themselves
    if (userToDelete.id === currentUser.id) {
        return NextResponse.json({
            error: 'Cannot delete your own account'
        }, {status: 400});
    }

    // First, update any proxies that reference this user to set userId to null
    await db.proxies.updateMany({
        where: {userId: id, tenantId: currentUser.tenantId},
        data: {userId: null}
    });

    // Delete the user (this will cascade delete related records due to foreign key constraints)
    await db.user.delete({
        where: {id, tenantId: currentUser.tenantId}
    });

    return NextResponse.json({
        message: 'User deleted successfully',
        deletedUser: {
            id: userToDelete.id,
            email: userToDelete.email
        }
    });
}

export const DELETE = authMiddleware(deleteUser);
