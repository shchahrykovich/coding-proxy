import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe.skip("Hello World worker", () => {
    it.skip("responds with not found and proper status for /404", async () => {
        const response = await SELF.fetch("http://example.com/404");
        expect(response.status).toBe(404);
        expect(await response.text()).toBe("Not found");
    });
});
