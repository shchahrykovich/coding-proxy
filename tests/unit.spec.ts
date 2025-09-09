import {
    env,
    createExecutionContext,
    waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/main";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
//const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Request", () => {
    it("unauthorised request should respond with redirect", async () => {
        const request = new Request("http://example.com/");
        // Create an empty context to pass to `worker.fetch()`
        const ctx = createExecutionContext();
        const response: Response = await worker.fetch(request, env, ctx);
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(302);
        expect(response.headers.get('LOCATION')).toBe('/sign-in');
        expect(await response.text()).toBe("");
    });
});
