import {NextRequest, NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import * as zod from 'zod';
import {
    createSuccessJsonResponse,
} from "@/infrastructure/api-requests";
import {PrismaClient, User} from "@prisma/client";
import {authMiddleware} from "@/infrastructure/middlewares";

const CreateUserSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(8),
    name: zod.string().optional(),
});

async function getUsers(currentUser: User, db: PrismaClient) {
    const users = await db.user.findMany({
        where: {
            tenantId: currentUser.tenantId
        },
        select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
        },
        orderBy: {email: 'asc'}
    });

    return createSuccessJsonResponse(users);
}

export const GET = authMiddleware(getUsers);

async function createUser(currentUser: User, db: PrismaClient, req: NextRequest) {
    const body = await req.json();
    const {email, password, name} = CreateUserSchema.parse(body);
    const existingUser = await db.user.findUnique({
        where: {email}
    });

    if (existingUser) {
        return NextResponse.json({error: 'User with this email already exists'}, {status: 409});
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await db.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            tenantId: currentUser.tenantId,
        },
        select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
        }
    });

    return createSuccessJsonResponse(newUser, 201);
}

export const POST = authMiddleware(createUser);
