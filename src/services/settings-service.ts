import {Settings} from "@/entities/settings";
import {PrismaClient} from "@prisma/client";

export const defaultPublicSettings: Record<Settings, string> = {
    [Settings.SessionRecalculationIntervalInSeconds]: '600',
    [Settings.AnthropicApiKey]: process.env.ANTHROPIC_API_KEY ?? '',
    [Settings.AnthropicBaseUrl]: process.env.ANTHROPIC_BASE_URL ?? '',
    [Settings.CloudflareAiGatewayToken]: process.env.CLOUDFLARE_AI_GATEWAY_TOKEN ?? '',
}

export async function getSetting(db: PrismaClient, tenantId: number, s: Settings) {
    const setting = await db.settings.findUnique({
        where: {
            tenantId_key: {
                tenantId,
                key: s.toString()
            }
        }
    });

    if (setting) {
        return setting.value;
    }

    if (defaultPublicSettings[s]) {
        return defaultPublicSettings[s];
    }

    throw new Error('can_not_find_setting');
}
