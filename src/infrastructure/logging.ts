import { AsyncLocalStorage } from "node:async_hooks";

export const loggingStore = new AsyncLocalStorage();

export function logError(error: any, name: string = 'generic_error', props: Record<string, unknown> = {}) {
    console.error(name, {
        error: error,
        message: error.message,
        stack: error.stack,
        ...(loggingStore.getStore() || {}),
        ...props,
    });
}

export function logInfo(message: string, props: Record<string, unknown> = {}) {
    console.log(message, {
        ...(loggingStore.getStore() || {}),
        ...props,
    });
}
