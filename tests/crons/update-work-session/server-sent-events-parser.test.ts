import { describe, it, expect } from "vitest";
import { parseServerSentEvents } from "@/crons/update-work-session/server-sent-events-parser";

describe("parseServerSentEvents", () => {

    it("should parse a simple text message", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_stop
data: {"type":"message_stop"}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.role).toBe("assistant");
        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0]).toEqual({
            type: "text",
            text: "Hello world"
        });
        expect(result.start?.message?.id).toBe("msg_123");
    });

    it("should parse a tool use message with complete JSON input", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_456","type":"message","role":"assistant","content":[],"model":"claude-3","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_123","name":"calculator","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"operation\\""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":": \\"add\\", \\"numbers\\": [1, 2]}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_stop
data: {"type":"message_stop"}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.role).toBe("assistant");
        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0]).toEqual({
            type: "tool_use",
            id: "tool_123",
            name: "calculator",
            input: {
                operation: "add",
                numbers: [1, 2]
            }
        });
    });

    it("should handle multiple content blocks in correct order", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_789","type":"message","role":"assistant","content":[],"model":"claude-3","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_456","name":"search","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\": \\"test\\"}"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Here are the results:"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: content_block_stop
data: {"type":"content_block_stop","index":1}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(2);
        expect(result.message.content[0]).toEqual({
            type: "tool_use",
            id: "tool_456",
            name: "search",
            input: { query: "test" }
        });
        expect(result.message.content[1]).toEqual({
            type: "text",
            text: "Here are the results:"
        });
    });

    it("should skip ping events", () => {
        const sseText = `event: ping
data: {"type":"ping"}

event: message_start
data: {"type":"message_start","message":{"id":"msg_ping","type":"message","role":"assistant","content":[],"model":"claude-3","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: ping

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Test"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0].text).toBe("Test");
        expect(result.start?.message?.id).toBe("msg_ping");
    });

    it("should handle malformed JSON gracefully", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_bad","type":"message","role":"assistant","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {invalid json}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid text"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0].text).toBe("Valid text");
        expect(result.start?.message?.id).toBe("msg_bad");
    });

    it("should handle malformed tool input JSON gracefully", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_tool_bad","type":"message","role":"assistant","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_bad","name":"test","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"invalid\\":\\"json"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0]).toEqual({
            type: "tool_use",
            id: "tool_bad",
            name: "test",
            input: {}
        });
    });

    it("should handle message_delta events and log usage", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_delta","type":"message","role":"assistant","content":[]}}

event: message_delta
data: {"type":"message_delta","usage":{"output_tokens":5}}

event: message_delta
data: {"type":"message_delta","usage":{"output_tokens":10}}`;

        const result = parseServerSentEvents(sseText);

        expect(result.start?.message?.id).toBe("msg_delta");
        expect(result.message.role).toBe("assistant");
    });

    it("should handle duplicate message_start events", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_first","type":"message","role":"assistant","content":[]}}

event: message_start
data: {"type":"message_start","message":{"id":"msg_second","type":"message","role":"assistant","content":[]}}

`;

        const result = parseServerSentEvents(sseText);

        // Should use the second message_start event
        expect(result.start?.message?.id).toBe("msg_second");
    });

    it("should handle unknown event types", () => {
        const sseText = `event: unknown_event
data: {"type":"unknown_type","data":"test"}`;

        const result = parseServerSentEvents(sseText);

        // Should still return a valid empty result
        expect(result.message.role).toBe("assistant");
        expect(result.message.content).toEqual([]);
    });

    it("should handle empty SSE text", () => {
        const result = parseServerSentEvents("");

        expect(result.message.role).toBe("assistant");
        expect(result.message.content).toEqual([]);
        expect(result.start).toBeNull();
    });

    it("should handle SSE text with only whitespace", () => {
        const result = parseServerSentEvents("   \n\n  \n ");

        expect(result.message.role).toBe("assistant");
        expect(result.message.content).toEqual([]);
        expect(result.start).toBeNull();
    });

    it("should handle events without data field", () => {
        const sseText = `event: message_start

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0].text).toBe("Hello");
    });

    it("should handle final event without trailing empty line", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_no_end","type":"message","role":"assistant","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_final","name":"final_tool","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"final\\": true}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content).toHaveLength(1);
        expect(result.message.content[0]).toEqual({
            type: "tool_use",
            id: "tool_final",
            name: "final_tool",
            input: { final: true }
        });
    });

    it("should handle role extraction from message_start", () => {
        const sseText = `event: message_start
data: {"type":"message_start","message":{"id":"msg_role","type":"message","role":"user","content":[]}}

`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.role).toBe("user");
        expect(result.start?.message?.role).toBe("user");
    });

    it("should initialize content blocks correctly for tool_use", () => {
        const sseText = `event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"init_tool","name":"init_name","input":{"existing":"data"}}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content[0]).toEqual({
            type: "tool_use",
            id: "init_tool",
            name: "init_name",
            input: {}
        });
    });

    it("should handle content_block_start with initial text", () => {
        const sseText = `event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Initial text"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" additional"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}`;

        const result = parseServerSentEvents(sseText);

        expect(result.message.content[0]).toEqual({
            type: "text",
            text: "Initial text additional"
        });
    });
});