import {PrismaClient} from "@prisma/client";
import {getSetting} from "./settings-service";
import {Settings} from "@/entities/settings";
import Anthropic from "@anthropic-ai/sdk";

export async function createAnthropicClient(db: PrismaClient, tenantId: number) {
    const apiKey = await getSetting(db, tenantId, Settings.AnthropicApiKey);
    const baseUrl = await getSetting(db, tenantId, Settings.AnthropicBaseUrl);

    let defaultHeaders = {};

    const token = await getSetting(db, tenantId, Settings.CloudflareAiGatewayToken);
    if (token) {
        defaultHeaders = {
            'cf-aig-authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'cf-aig-metadata': JSON.stringify({})
        }
    }

    const anthropic = new Anthropic({
        apiKey: apiKey,
        baseURL: baseUrl,
        defaultHeaders
    });

    return anthropic;
}
