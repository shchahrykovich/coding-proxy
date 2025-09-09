import {
    Message,
    MessageDeltaEvent, MessageDeltaUsage, MessageParam,
// @ts-expect-error none
} from "@anthropic-ai/sdk/src/resources/messages/messages";
import {logInfo} from "@/infrastructure/logging";

export type SSEEvent = {
    event?: string;
    data?: string;
    type?: string;
    [key: string]: any;
}

export type ParsedServerSentEvent = {
    message: MessageParam;
    start: Message;
}

export function parseServerSentEvents(sseText: string): ParsedServerSentEvent {
    const lines = sseText.split('\n');
    let currentEvent: SSEEvent = {};

    const usageDeltas: MessageDeltaUsage[] = [];
    let startMessage: Message | null = null;

    // Message structure to build
    const message: MessageParam = {
        role: "assistant",
        content: [] as any[]
    };

    // Track content blocks by index
    const contentBlocks: { [index: number]: any } = {};

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === '') {
            // Empty line indicates end of event
            if (Object.keys(currentEvent).length > 0) {
                // Skip ping events
                if (currentEvent.event === 'ping') {
                    currentEvent = {};
                    continue;
                }

                // Parse JSON data if present
                if (currentEvent.data) {
                    try {
                        const parsedData = JSON.parse(currentEvent.data);

                        if (parsedData.type === 'message_start') {
                            if (startMessage) {
                                logInfo('second_start_message_detected', {
                                    startMessage,
                                    parsedData
                                });
                            }
                            startMessage = parsedData as Message;
                            // Extract basic message info from message_start
                            if (parsedData.message?.role) {
                                message.role = parsedData.message.role;
                            }
                        } else if (parsedData.type === 'content_block_start') {
                            // Initialize content block
                            const index = parsedData.index;
                            const contentBlock = parsedData.content_block;

                            if (contentBlock.type === 'text') {
                                contentBlocks[index] = {
                                    type: 'text',
                                    text: contentBlock.text || ''
                                };
                            } else if (contentBlock.type === 'tool_use') {
                                contentBlocks[index] = {
                                    type: 'tool_use',
                                    id: contentBlock.id,
                                    name: contentBlock.name,
                                    input: {}
                                };
                            }
                        } else if (parsedData.type === 'content_block_delta') {
                            // Update content block with delta
                            const index = parsedData.index;
                            const delta = parsedData.delta;

                            if (delta.type === 'text_delta' && contentBlocks[index]) {
                                contentBlocks[index].text += delta.text || '';
                            } else if (delta.type === 'input_json_delta' && contentBlocks[index]) {
                                // Accumulate partial JSON for tool inputs
                                if (!contentBlocks[index].partial_json) {
                                    contentBlocks[index].partial_json = '';
                                }
                                contentBlocks[index].partial_json += delta.partial_json || '';
                            }
                        } else if (parsedData.type === 'content_block_stop') {
                            // Finalize content block
                            const index = parsedData.index;
                            if (contentBlocks[index]) {
                                // Parse accumulated JSON for tool inputs
                                if (contentBlocks[index].partial_json) {
                                    try {
                                        contentBlocks[index].input = JSON.parse(contentBlocks[index].partial_json);
                                        delete contentBlocks[index].partial_json;
                                    } catch (error) {
                                        // Keep as empty object if JSON parsing fails
                                        contentBlocks[index].input = {};
                                        delete contentBlocks[index].partial_json;
                                    }
                                }
                            }
                        } else if (parsedData.type === 'message_delta') {
                            const m = parsedData as MessageDeltaEvent;
                            usageDeltas.push(m.usage);
                        } else if (parsedData.type === 'message_stop') {
                            // ignore
                        } else {
                            logInfo('unknown_type', {
                                type: parsedData.type
                            });
                        }
                    } catch (error) {
                        // Skip malformed JSON
                    }
                }
                currentEvent = {};
            }
            continue;
        }

        if (trimmedLine.startsWith('event: ')) {
            currentEvent.event = trimmedLine.substring(7).trim();
        } else if (trimmedLine.startsWith('data: ')) {
            currentEvent.data = trimmedLine.substring(6).trim();
        }
    }

    // Handle last event if no trailing empty line
    if (Object.keys(currentEvent).length > 0 && currentEvent.event !== 'ping') {
        if (currentEvent.data) {
            try {
                const parsedData = JSON.parse(currentEvent.data);
                // Apply same logic as above for the final event
                if (parsedData.type === 'content_block_stop') {
                    const index = parsedData.index;
                    if (contentBlocks[index] && contentBlocks[index].partial_json) {
                        try {
                            contentBlocks[index].input = JSON.parse(contentBlocks[index].partial_json);
                            delete contentBlocks[index].partial_json;
                        } catch (error) {
                            contentBlocks[index].input = {};
                            delete contentBlocks[index].partial_json;
                        }
                    }
                }
            } catch (error) {
                // Skip malformed JSON
            }
        }
    }

    // Convert content blocks to ordered array
    const sortedIndexes = Object.keys(contentBlocks).map(Number).sort((a, b) => a - b);
    for (const index of sortedIndexes) {
        message.content.push(contentBlocks[index]);
    }

    return {
        message: message,
        start: startMessage,
    };
}
