import {defineWorkersConfig} from "@cloudflare/vitest-pool-workers/config";
import path from "path";

export default defineWorkersConfig({
    test: {
        globals: true,
        testTimeout: 20000,
        fileParallelism: false,
        poolOptions: {
            workers: {
                singleWorker: true,
                wrangler: {configPath: "./wrangler.jsonc"},
            },
        },
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'text-summary'],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});

