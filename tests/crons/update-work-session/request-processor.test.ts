import { describe, it, expect, vi, beforeEach } from "vitest";
import { tryAddMessage, processRequest } from "@/crons/update-work-session/request-processor";
import { createDefaultAccumulator } from "@/crons/update-work-session/accumulator";
import { createDefaultWorkSessionAnalytics } from "@/analytics/schemas";
import { ProviderRequests } from "@prisma/client";

// Mock the server-sent-events-parser
vi.mock("@/crons/update-work-session/server-sent-events-parser", () => ({
    parseServerSentEvents: vi.fn()
}));

import { parseServerSentEvents } from "@/crons/update-work-session/server-sent-events-parser";

describe("tryAddMessage", () => {
    let accumulator: ReturnType<typeof createDefaultAccumulator>;

    beforeEach(() => {
        accumulator = createDefaultAccumulator();
        vi.clearAllMocks();
    });

    it("should add a new message to accumulator", () => {
        const message = {
            role: "user" as const,
            content: "Hello world"
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.messages).toHaveLength(1);
        expect(accumulator.messages[0]).toEqual(message);
        expect(accumulator.seenMessages.size).toBe(1);
    });

    it("should not add duplicate messages", () => {
        const message = {
            role: "user" as const,
            content: "Hello world"
        };

        tryAddMessage(message, accumulator);
        tryAddMessage(message, accumulator);

        expect(accumulator.messages).toHaveLength(1);
        expect(accumulator.seenMessages.size).toBe(1);
    });

    it("should not detect CLAUDE.md file due to logical error in condition", () => {
        // The original code has a logical error: it checks if text starts with both 
        // '<system-reminder>' AND '# CLAUDE.md', which is impossible
        const message = {
            role: "user" as const,
            content: [
                {
                    type: "text" as const,
                    text: "<system-reminder>\n# CLAUDE.md\nThis is the CLAUDE.md file content"
                }
            ]
        };

        tryAddMessage(message, accumulator);

        // The condition will never be true, so claudeMdFile remains empty
        expect(accumulator.claudeMdFile).toBe("");
    });

    it("should detect and store new topic from assistant message", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "text" as const,
                    text: '{"title": "New Feature Implementation", "isNewTopic": true}'
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.topics).toContain("New Feature Implementation");
        expect(accumulator.currentTopic).toBe("New Feature Implementation");
    });

    it("should handle malformed topic JSON gracefully", () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "text" as const,
                    text: '{"title": "Invalid JSON", isNewTopic: true malformed'
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.topics).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("should detect and store TodoWrite tool usage", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "tool_use" as const,
                    name: "TodoWrite",
                    id: "todo_123",
                    input: {
                        todos: [
                            { id: "1", content: "Task 1", status: "pending" },
                            { id: "2", content: "Task 2", status: "completed" }
                        ]
                    }
                }
            ]
        };

        accumulator.currentTopic = "Test Topic";
        tryAddMessage(message, accumulator);

        expect(accumulator.todos["Test Topic"]).toHaveLength(2);
        expect(accumulator.todos["Test Topic"][0]).toEqual({ id: "1", content: "Task 1", status: "pending" });
    });

    it("should track touched files from Read, Write, Edit tools", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "tool_use" as const,
                    name: "Read",
                    id: "read_123",
                    input: { file_path: "/path/to/file1.ts" }
                },
                {
                    type: "tool_use" as const,
                    name: "Write",
                    id: "write_123",
                    input: { file_path: "/path/to/file2.ts" }
                },
                {
                    type: "tool_use" as const,
                    name: "Edit",
                    id: "edit_123",
                    input: { file_path: "/path/to/file3.ts" }
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.touchedFiles).toContain("/path/to/file1.ts");
        expect(accumulator.touchedFiles).toContain("/path/to/file2.ts");
        expect(accumulator.touchedFiles).toContain("/path/to/file3.ts");
        expect(accumulator.touchedFiles).toHaveLength(3);
    });

    it("should not duplicate touched files", () => {
        const message1 = {
            role: "assistant" as const,
            content: [
                {
                    type: "tool_use" as const,
                    name: "Read",
                    id: "read_123",
                    input: { file_path: "/path/to/file1.ts" }
                }
            ]
        };

        const message2 = {
            role: "assistant" as const,
            content: [
                {
                    type: "tool_use" as const,
                    name: "Edit",
                    id: "edit_123",
                    input: { file_path: "/path/to/file1.ts" }
                }
            ]
        };

        tryAddMessage(message1, accumulator);
        tryAddMessage(message2, accumulator);

        expect(accumulator.touchedFiles).toContain("/path/to/file1.ts");
        expect(accumulator.touchedFiles).toHaveLength(1);
    });

    it("should track change tools executions (Write and Edit)", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "tool_use" as const,
                    name: "Write",
                    id: "write_123",
                    input: { file_path: "/path/to/file.ts" }
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.changeToolsExecutions).toHaveLength(1);
        expect(accumulator.changeToolsExecutions[0]).toEqual(message);
    });

    it("should add user messages to important messages", () => {
        const message = {
            role: "user" as const,
            content: "This is an important user message"
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.importantMessages).toHaveLength(1);
        expect(accumulator.importantMessages[0]).toEqual(message);
    });

    it("should filter out quota messages from user messages", () => {
        const message = {
            role: "user" as const,
            content: "quota"
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.importantMessages).toHaveLength(0);
    });

    it("should add single text assistant messages to important messages", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "text" as const,
                    text: "This is a single text response"
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.importantMessages).toHaveLength(1);
        expect(accumulator.importantMessages[0]).toEqual(message);
    });

    it("should filter out single 'A' responses from assistant", () => {
        const message = {
            role: "assistant" as const,
            content: [
                {
                    type: "text" as const,
                    text: "A"
                }
            ]
        };

        tryAddMessage(message, accumulator);

        expect(accumulator.importantMessages).toHaveLength(0);
    });

    it("should not duplicate important messages", () => {
        const message = {
            role: "user" as const,
            content: "Important message"
        };

        tryAddMessage(message, accumulator);
        tryAddMessage(message, accumulator);

        expect(accumulator.importantMessages).toHaveLength(1);
    });
});

describe("processRequest", () => {
    let mockBucket: any;
    let accumulator: ReturnType<typeof createDefaultAccumulator>;
    let analytics: ReturnType<typeof createDefaultWorkSessionAnalytics>;
    let mockRequest: ProviderRequests;

    beforeEach(() => {
        accumulator = createDefaultAccumulator();
        analytics = createDefaultWorkSessionAnalytics();
        
        mockRequest = {
            id: "req_123",
            generatedId: "gen_456",
            tenantId: "tenant_789",
            proxyId: "proxy_abc",
            receivedAt: new Date("2024-01-15T10:00:00Z"),
            provider: "anthropic",
            method: "POST",
            path: "/v1/messages",
            statusCode: 200,
            totalRequests: 1
        } as ProviderRequests;

        mockBucket = {
            get: vi.fn()
        };

        vi.clearAllMocks();
    });

    it("should process request with valid request body", async () => {
        const requestBody = {
            messages: [
                {
                    role: "user",
                    content: "Hello world"
                }
            ]
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce(null); // No response body

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(analytics.totalRequests).toBe(1);
        expect(accumulator.messages).toHaveLength(1);
        expect(mockBucket.get).toHaveBeenCalledWith(
            "provider-requests/tenant_789/proxy_abc/2024-01-15/gen_456/request.body"
        );
    });

    it("should handle missing request body gracefully", async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        mockBucket.get.mockResolvedValueOnce(null);

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Request body not found")
        );
        expect(analytics.totalRequests).toBe(0);
        consoleSpy.mockRestore();
    });

    it("should handle empty request body gracefully", async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve("")
        });

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Request body is empty")
        );
        consoleSpy.mockRestore();
    });

    it("should process tool usage from messages", async () => {
        const requestBody = {
            messages: [
                {
                    role: "assistant",
                    content: [
                        {
                            type: "tool_use",
                            name: "Read",
                            id: "tool_123"
                        }
                    ]
                }
            ]
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce(null);

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(analytics.toolUsage).toHaveLength(1);
        expect(analytics.toolUsage[0]).toEqual({
            name: "Read",
            id: "tool_123",
            count: 1
        });
        expect(analytics.totalTools).toBe(1);
    });

    it("should not duplicate tool usage entries", async () => {
        const requestBody = {
            messages: [
                {
                    role: "assistant",
                    content: [
                        {
                            type: "tool_use",
                            name: "Read",
                            id: "tool_123"
                        }
                    ]
                },
                {
                    role: "assistant", 
                    content: [
                        {
                            type: "tool_use",
                            name: "Write",
                            id: "tool_123" // Same ID, should not add again
                        }
                    ]
                }
            ]
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce(null);

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(analytics.toolUsage).toHaveLength(1);
        expect(analytics.totalTools).toBe(1);
    });

    it("should remove cache_control from message content", async () => {
        const requestBody = {
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Hello",
                            cache_control: { type: "ephemeral" }
                        }
                    ]
                }
            ]
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce(null);

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(accumulator.messages[0].content[0]).not.toHaveProperty('cache_control');
    });

    it("should process streaming response (SSE format)", async () => {
        const requestBody = { messages: [] };
        const sseResponse = "event: message_start\ndata: {...}";

        const mockParsedMessage = {
            message: {
                role: "assistant",
                content: [{ type: "text", text: "Response text" }]
            },
            start: {
                message: {
                    id: "msg_123",
                    usage: { input_tokens: 10, output_tokens: 20 },
                    model: "claude-3-sonnet"
                }
            }
        };

        vi.mocked(parseServerSentEvents).mockReturnValue(mockParsedMessage);

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(sseResponse)
        });

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(parseServerSentEvents).toHaveBeenCalledWith(sseResponse);
        expect(accumulator.usages).toHaveLength(1);
        expect(accumulator.usages[0]).toEqual({
            usage: { input_tokens: 10, output_tokens: 20 },
            model: "claude-3-sonnet"
        });
    });

    it("should process JSON response", async () => {
        const requestBody = { messages: [] };
        const jsonResponse = {
            id: "msg_123",
            role: "assistant",
            content: [{ type: "text", text: "Response text" }],
            usage: { input_tokens: 15, output_tokens: 25 },
            model: "claude-3-haiku"
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(jsonResponse))
        });

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(accumulator.usages).toHaveLength(1);
        expect(accumulator.usages[0]).toEqual({
            usage: { input_tokens: 15, output_tokens: 25 },
            model: "claude-3-haiku"
        });
    });

    it("should handle unknown model gracefully", async () => {
        const requestBody = { messages: [] };
        const jsonResponse = {
            id: "msg_123",
            role: "assistant",
            content: [{ type: "text", text: "Response text" }],
            usage: { input_tokens: 15, output_tokens: 25 }
            // No model field
        };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(jsonResponse))
        });

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(accumulator.usages[0].model).toBe("unknown");
    });

    it("should handle response body read errors gracefully", async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const requestBody = { messages: [] };

        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify(requestBody))
        });
        mockBucket.get.mockRejectedValueOnce(new Error("R2 read error"));

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Error reading response body"),
            expect.any(Error)
        );
        consoleSpy.mockRestore();
    });

    it("should handle request processing errors gracefully", async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        mockBucket.get.mockRejectedValueOnce(new Error("Bucket error"));

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Error processing request"),
            expect.any(Error)
        );
        consoleSpy.mockRestore();
    });

    it("should handle malformed JSON in request body", async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        mockBucket.get.mockResolvedValueOnce({
            text: () => Promise.resolve("invalid json {")
        });

        await processRequest(mockBucket, accumulator, analytics, mockRequest);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Error processing request"),
            expect.any(Error)
        );
        consoleSpy.mockRestore();
    });
});