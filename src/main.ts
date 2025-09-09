// `.open-next/worker.ts` is generated at build time
import { default as handler } from "../.open-next/worker.js";
import {BaseMessage, NewRequestMessage, UpdateWorkSessionMessage} from "@/lib/queue-messages";
import {PrismaD1} from "@prisma/adapter-d1";
import {PrismaClient} from "@prisma/client";
import {processEvent as newRequestEventProcessor} from "@/crons/new-request-event-processor";
import {processEvent as updateWorkSession} from "@/crons/update-work-session/update-work-session";
import {loggingStore, logInfo} from "@/infrastructure/logging";
import {v7 as uuidv7} from "uuid";

export default {
    fetch: handler.fetch,

    // /**
    //  * Scheduled Handler
    //  *
    //  * Can be tested with:
    //  * - `wrangler dev --test-scheduled`
    //  * - `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`
    //  * @param event
    //  */
    // async scheduled(event, env) {
    //     console.log("Scheduled event", event, env.CF_ACCOUNT_ID);
    // },

    async queue(batch, env): Promise<void> {
        for (const message of batch.messages) {
            const m = message.body as BaseMessage;

            const adapter = new PrismaD1(env.DB);
            const db = new PrismaClient({adapter});

            await loggingStore.run({
                message: m,
                reqId: uuidv7(),
            }, async () => {
                logInfo('processing_queue_message');
                if (m.type === 'provider-request') {
                    await newRequestEventProcessor(db,
                        env.QUEUE_NEW_REQUESTS,
                        env.PRIVATE_FILES,
                        m as NewRequestMessage);
                } else if (m.type === 'update-session') {
                    await updateWorkSession(db,
                        env.PRIVATE_FILES,
                        m as UpdateWorkSessionMessage);
                }
            });

            message.ack();
        }
    }
} satisfies ExportedHandler<CloudflareEnv>;

// `.open-next/worker.ts` is generated at build time
export { DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";
