import {NextRequest} from 'next/server';
import * as zod from 'zod';
import {DefaultSettingTypes, Settings, SettingTypes} from "@/entities/settings";
import {authMiddleware} from "@/infrastructure/middlewares";
import {PrismaClient, User} from "@prisma/client";
import {createSuccessJsonResponse} from "@/infrastructure/api-requests";

const UpdateSettingSchema = zod.object({
    key: zod.string().min(1),
    value: zod.string(),
});

async function getAllSettings(currentUser: User, db: PrismaClient) {
    const settings = await db.settings.findMany({
        where: {
            tenantId: currentUser.tenantId,
            isPublic: true,
        },
        select: {
            id: true,
            key: true,
            value: true,
            type: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: {key: 'asc'}
    });

    // Filter out values for hidden type settings
    const filteredSettings = settings.map(setting => {
        if (setting.type === SettingTypes.Hidden.toString()) {
            return {
                ...setting,
                value: '' // Don't return the actual value for hidden settings
            };
        }
        return setting;
    });

    return createSuccessJsonResponse(filteredSettings);
}

export const GET = authMiddleware(getAllSettings);

async function updateSettings(user: User, db: PrismaClient, req: NextRequest) {
    const body = await req.json();
    const {key, value} = UpdateSettingSchema.parse(body);

    const updatedSetting = await db.settings.upsert({
        where: {
            tenantId_key: {
                tenantId: user.tenantId,
                key: key
            }
        },
        update: {
            value: value,
            updatedAt: new Date()
        },
        create: {
            tenantId: user.tenantId,
            key: key,
            value: value,
            type: DefaultSettingTypes[key as Settings].toString(),
            isPublic: true,
        },
        select: {
            id: true,
            key: true,
            value: true,
            type: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return createSuccessJsonResponse(updatedSetting);
}

export const PUT = authMiddleware(updateSettings);
