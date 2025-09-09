import {NewRequestMessage, UpdateWorkSessionMessage} from "@/lib/queue-messages";
import {getBucket, getDB, getQueueForNewRequests} from "@/lib/utils";
import {processEvent as newRequestEventProcessor} from "@/crons/new-request-event-processor";
import {processEvent as updateWorkSession} from "@/crons/update-work-session/update-work-session";
import {logError} from "@/infrastructure/logging";

function runInParallel(func: () => Promise<void>) {
    (async () => {
        try {
            await func();
        } catch (error) {
            logError(error);
        }
    })();
}

export async function sendNewRequestEvent(message: NewRequestMessage) {
    const queue = await getQueueForNewRequests();
    await queue.send(message);

    if (process.env.NODE_ENV === 'development') {
        runInParallel(async () => {
            const db = await getDB();
            const bucket = await getBucket();
            await newRequestEventProcessor(db, queue, bucket, message);
        });
    }
}

export async function sendUpdateSession(queue: Queue,
                                        message: UpdateWorkSessionMessage,
                                        delaySeconds = 10 * 60) {
    await queue.send(message, {
        delaySeconds: delaySeconds,
    });

    if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
            runInParallel((async () => {
                const db = await getDB();
                const bucket = await getBucket();
                await updateWorkSession(db, bucket, message);
            }));
        }, delaySeconds * 1000);
    }
}
