import 'server-only'

import {PrismaClient} from "@prisma/client";
import {defaultPublicSettings} from "@/services/settings-service";
import {DefaultSettingTypes, Settings} from "@/entities/settings";
import {createProxyForTenant} from "@/services/proxy-service";

export async function createTenant(db: PrismaClient) {
    const tenant = await db.tenants.create({
        data: {
            isActive: true,
        }
    });

    for (const setting of Object.entries(defaultPublicSettings)) {
        await db.settings.create({
            data: {
                key: setting[0],
                value: setting[1],
                tenantId: tenant.id,
                isPublic: true,
                type: DefaultSettingTypes[setting[0] as Settings].toString(),
            }
        });
    }

    await createProxyForTenant(db, 'Default', tenant.id);

    return tenant;
}
