import {PrismaClient} from "@prisma/client";
import {NewRequestMessage, UpdateWorkSessionMessage} from "@/lib/queue-messages";
import {sendUpdateSession} from "@/lib/queue-sender";
import {getSetting} from "@/services/settings-service";
import {Settings} from "@/entities/settings";
import {logError} from "@/infrastructure/logging";
import _ from "lodash";

export async function processEvent(db: PrismaClient,
                                   queue: Queue,
                                   bucket: R2Bucket,
                                   m: NewRequestMessage) {
    let workSessionId: string | null = null;
    let providerContributorId: string | null = null;
    let accountId: string | null = null;

    let requestBodyObj;
    let clientVersion = null;
    try {
        if (m.provider === 'anthropic') {
            const requestDate = new Date(m.requestDate);
            const basePath = `provider-requests/${m.tenantId}/${m.proxyId}/${requestDate.toISOString().substring(0, 10)}`;
            requestBodyObj = await bucket.get(`${basePath}/${m.requestId}/request.body`);
            if (requestBodyObj) {
                const requestBody = await requestBodyObj.text();
                const request = JSON.parse(requestBody);
                const rawUserId = request.metadata.user_id;
                const parts = rawUserId.split('_');
                providerContributorId = parts[1];
                accountId = parts[3];
                workSessionId = parts[5];
            }

            const requestMetaObj = await bucket.get(`${basePath}/${m.requestId}/request.json`);
            if (requestMetaObj) {
                const requestBody = await requestMetaObj.text();
                const request = JSON.parse(requestBody);
                const userAgent: string[] | undefined = _.find(request.headers as string[][], h => h[0] === 'user-agent');
                if (userAgent) {
                    clientVersion = 0 < userAgent.length ? userAgent[1] : null;
                }
            }
        }
    } catch (e) {
        logError(e);
        workSessionId = null;
        providerContributorId = null;
        accountId = null;
    }

    let sessionId = null;
    let existingContributorId = null;
    if (workSessionId) {
        // Create contributor record if it doesn't exist
        if (providerContributorId && accountId) {
            const existingContributor = await db.contributors.findFirst({
                where: {
                    tenantId: m.tenantId,
                    provider: m.provider,
                    proxyId: m.proxyId,
                    providerSpecificId: providerContributorId,
                    accountId: accountId,
                }
            });
            existingContributorId = existingContributor?.id;

            if (!existingContributor) {
                const newContributor = await db.contributors.create({
                    data: {
                        tenantId: m.tenantId,
                        provider: m.provider,
                        proxyId: m.proxyId,
                        providerSpecificId: providerContributorId,
                        accountId: accountId,
                    }
                });
                existingContributorId = newContributor.id;
            }
        }

        let session = await db.workSessions.findUnique({
            where: {
                providerSpecificId: workSessionId,
                provider: m.provider,
                tenantId: m.tenantId,
                proxyId: m.proxyId,
            }
        });

        if (!session) {
            session = await db.workSessions.create({
                data: {
                    providerSpecificId: workSessionId,
                    provider: m.provider,
                    tenantId: m.tenantId,
                    proxyId: m.proxyId,
                    providerContributorId: providerContributorId!,
                    contributorId: existingContributorId,
                    accountId: accountId!,
                }
            });
        }

        sessionId = session.id;

        const updateIntervalRaw = await getSetting(db, m.tenantId, Settings.SessionRecalculationIntervalInSeconds);
        const updateInterval = parseInt(updateIntervalRaw);
        await sendUpdateSession(queue, {
            type: "update-session",
            tenantId: m.tenantId,
            sessionId: sessionId,
            provider: m.provider,
        } as UpdateWorkSessionMessage, updateInterval);
    }

    await db.providerRequests.create({
        data: {
            tenantId: m.tenantId,
            proxyId: m.proxyId,
            generatedId: m.requestId,
            provider: m.provider,
            receivedAt: new Date(m.requestDate),
            providerContributorId: providerContributorId!,
            contributorId: existingContributorId,
            contributorAccountId: accountId,
            workSessionId: sessionId,
            clientVersion
        }
    });

    await db.proxies.update({
        where: {
            id: m.proxyId,
        },
        data: {
            totalRequests: {
                increment: 1,
            }
        }
    });
}
