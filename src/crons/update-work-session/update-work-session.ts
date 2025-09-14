import {PrismaClient, ProviderRequests, WorkSessions} from "@prisma/client";
import {UpdateWorkSessionMessage} from "@/lib/queue-messages";
import {createDefaultWorkSessionAnalytics, WorkSessionAnalytics} from "@/analytics/schemas";
import _ from "lodash";
import {createAnthropicClient} from "@/services/anthropic-service";
import {Accumulator, createDefaultAccumulator} from "./accumulator";
import {processRequest} from "@/crons/update-work-session/request-processor";
import {summarize} from "@/crons/update-work-session/summarizer";
import {logError, logInfo} from "@/infrastructure/logging";

async function saveCombined(session: any, accumulator: Accumulator, bucket: R2Bucket) {
    if (accumulator.messages.length === 0) {
        return;
    }

    try {
        const requestDate = session.createdAt.toISOString().substring(0, 10);
        const basePath = `work-sessions/${session.tenantId}/${session.id}/${requestDate}`;
        const combinedPath = `${basePath}/combined.json`;

        const combinedData = {
            sessionId: session.id,
            tenantId: session.tenantId,
            createdAt: session.createdAt,
            lastUpdated: new Date().toISOString(),
            messageCount: accumulator.messages.length,
            messages: accumulator.messages
        };

        await bucket.put(combinedPath, JSON.stringify(combinedData, null, 2), {
            httpMetadata: {contentType: 'application/json'},
            customMetadata: {
                sessionId: session.id.toString(),
                tenantId: session.tenantId.toString(),
                messageCount: accumulator.messages.length.toString()
            }
        });

        logInfo('saved_combined_messages', {
            combinedPath,
            numberOfMessage: accumulator.messages.length
        });
    } catch (error) {
        logError(error, 'saved_combined_messages_failed');
    }
}

async function updateDbRecords(db: PrismaClient,
                               session: WorkSessions,
                               m: UpdateWorkSessionMessage,
                               analytics: WorkSessionAnalytics,
                               lastRequest: ProviderRequests | null) {
    await db.modelUsages.deleteMany({
        where: {
            workSessionId: session.id,
            tenantId: m.tenantId
        }
    });

    const projectName = analytics.projects?.length ? analytics.projects[0] : '';
    let project = await db.projects.findUnique({
        where: {
            tenantId_name: {
                tenantId: m.tenantId,
                name: projectName
            }
        }
    });

    if (!project && projectName) {
        project = await db.projects.create({
            data: {
                tenantId: m.tenantId,
                name: projectName
            }
        });
    }

    if (project) {
        await db.memoryRecords.deleteMany({
            where: {
                projectId: project.id,
                tenantId: m.tenantId,
                workSessionId: session.id
            }
        });

        await db.$executeRaw`
            DELETE
            FROM MemoryRecordsForSearch
            WHERE tenantId = ${m.tenantId}
              AND projectId = ${project.id}
              AND workSessionId = ${session.id};
        `;
    }

    await db.modelUsages.createMany({
        data: analytics.modelUsage.map(mu => ({
            tenantId: m.tenantId,
            workSessionId: session.id,
            proxyId: session.proxyId,
            provider: m.provider,
            projectId: project?.id,
            contributorId: session.contributorId,
            accountId: session.accountId,
            modelName: mu.model,
            inputTokens: mu.inputTokens,
            outputTokens: mu.outputTokens,
        }))
    })

    const memoryRecords = Object.entries(analytics.topicImplementations);
    const toInsertMemoryRecords = memoryRecords.map(([title, body]) => ({
        tenantId: m.tenantId,
        projectId: project?.id,
        workSessionId: session.id,
        title,
        body
    }));
    await db.memoryRecords.createMany({
        data: toInsertMemoryRecords
    });
    const recordsToSync = await db.memoryRecords.findMany({
        where: {
            tenantId: m.tenantId,
            projectId: project?.id,
            workSessionId: session.id,
        }
    });
    for (const toSync of recordsToSync) {
        await db.$executeRaw`
            INSERT INTO MemoryRecordsForSearch (title, body, recordId, tenantId, workSessionId, projectId, createdAt)
            VALUES (${toSync.title}, ${toSync.body}, ${toSync.id}, ${toSync.tenantId}, ${toSync.workSessionId},
                    ${toSync.projectId}, ${toSync.createdAt});
        `;
    }

    await db.workSessions.update({
        where: {
            id: session.id,
            tenantId: m.tenantId
        },
        data: {
            analyticsJson: JSON.stringify(analytics),
            lastReceivedRequestAt: lastRequest?.receivedAt,
            lastProcessedRequestId: lastRequest?.id,
            projectId: project?.id,
            project: projectName,
            title: analytics.title,
            totalRequests: analytics.totalRequests,
            totalInputTokens: _.sumBy(analytics.modelUsage, m => m.inputTokens),
            totalOutputTokens: _.sumBy(analytics.modelUsage, m => m.outputTokens),
        }
    });

    if (project) {
        const allSessionsInProject = await db.workSessions.findMany({
            where: {
                tenantId: m.tenantId,
                projectId: project.id
            },
            select: {
                totalInputTokens: true,
                totalOutputTokens: true,
                totalRequests: true,
            }
        });

        await db.projects.update({
                where: {
                    id: project.id,
                    tenantId: m.tenantId,
                },
                data: {
                    totalInputTokens: _.sumBy(allSessionsInProject, t => t.totalInputTokens || 0),
                    totalOutputTokens: _.sumBy(allSessionsInProject, t => t.totalOutputTokens || 0),
                    totalRequests: _.sumBy(allSessionsInProject, t => t.totalRequests || 0),
                }
            }
        );
    }
}

export async function processEvent(db: PrismaClient,
                                   bucket: R2Bucket,
                                   m: UpdateWorkSessionMessage) {
    const session = await db.workSessions.findUnique({
        where: {
            id: m.sessionId,
            tenantId: m.tenantId,
        }
    });

    let lastRequest: ProviderRequests | null = null;
    if (session) {
        let cursor = 0;
        let hasMoreRequests = true;

        const analytics = createDefaultWorkSessionAnalytics();
        const accumulator: Accumulator = createDefaultAccumulator();

        while (hasMoreRequests) {
            const requests = await db.providerRequests.findMany({
                where: {
                    tenantId: m.tenantId,
                    workSessionId: session.id,
                    id: {
                        gt: cursor
                    }
                },
                take: 10,
                orderBy: {
                    id: 'asc'
                }
            });

            if (requests.length === 0) {
                hasMoreRequests = false;
                break;
            }

            for (const request of requests) {
                await processRequest(bucket, accumulator, analytics, request);
                cursor = request.id;
                lastRequest = request;
            }

            await db.workSessions.update({
                where: {
                    id: session.id
                },
                data: {
                    lastProcessedRequestId: cursor
                }
            });

            if (requests.length < 10) {
                hasMoreRequests = false;
            }
        }

        await saveCombined(session, accumulator, bucket);
        try {
            const anthropic = await createAnthropicClient(db, session.tenantId);
            await summarize(anthropic, analytics, accumulator);
        } catch (err) {
            logError(err, 'can_not_summarize');
        }

        await updateDbRecords(db, session, m, analytics, lastRequest);

        logInfo('updated_session');
    }
}
