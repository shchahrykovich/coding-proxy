import {ProviderRequests} from "@prisma/client";
import {WorkSessionAnalytics, ToolUsage, ToDoItems} from "@/analytics/schemas";
import {hash} from "ohash";

import {
    ContentBlockParam, Message,
    MessageCreateParamsStreaming,
    ToolUseBlockParam,
// @ts-expect-error none
} from "@anthropic-ai/sdk/src/resources/messages/messages";
import _ from "lodash";
import {Accumulator} from "./accumulator";
import {parseServerSentEvents} from "@/crons/update-work-session/server-sent-events-parser";

export function tryAddMessage(message: MessageCreateParamsStreaming, accumulator: Accumulator) {
    const hashState = hash(message);
    if (!accumulator.seenMessages.has(hashState)) {
        accumulator.seenMessages.add(hashState);
        accumulator.messages.push(message);
    }

    if (!accumulator.seenCurrentTopicMessages.has(hashState)) {
        accumulator.seenCurrentTopicMessages.add(hashState);
        accumulator.currentTopicMessages.push(message);
    }

    const isClaudeMdFile = message.role === 'user' &&
        message.content instanceof Array &&
        message.content.length &&
        _.some(message.content as Array<ContentBlockParam>, c =>
            c.type === 'text' &&
            c.text.startsWith('<system-reminder>') &&
            c.text.startsWith('# CLAUDE.md')
        );

    if (isClaudeMdFile) {
        const textBlock = message.content.find((c: ContentBlockParam) =>
            c.type === 'text' &&
            c.text.startsWith('<system-reminder>') &&
            c.text.startsWith('# CLAUDE.md')
        ) as { type: 'text', text: string };
        if (textBlock) {
            accumulator.claudeMdFile = textBlock.text;
        }
    }

    const isAssistantNewTopic = message.role === 'assistant' &&
        message.content instanceof Array &&
        message.content.length &&
        message.content[0].text?.includes('isNewTopic');
    if (isAssistantNewTopic) {
        try {
            if (accumulator.currentTopic) {
                accumulator.topicMessages[accumulator.currentTopic] = accumulator.currentTopicMessages;
            }

            const topic: { title: string } = JSON.parse(message.content[0].text);
            accumulator.topics = _.uniq([...accumulator.topics, topic.title]);

            accumulator.currentTopic = topic.title;
            accumulator.seenCurrentTopicMessages = new Set<string>();
            accumulator.currentTopicMessages = [];
        } catch (error) {
            console.warn(`Failed to parse new topic from message: ${message.content[0].text}`, error);
        }
    }

    const isAssistantUpdateToDo = message.role === 'assistant' && message.content instanceof Array &&
        _.some(message.content as Array<ContentBlockParam>, c => c.type === 'tool_use' && c.name == "TodoWrite");
    if (isAssistantUpdateToDo) {
        const todoContent: ToolUseBlockParam = message.content.find((c: ToolUseBlockParam) => c.type === 'tool_use' && c.name === 'TodoWrite');
        if (todoContent && todoContent.input && todoContent.input.todos) {
            const todos: ToDoItems[] = todoContent.input.todos;
            accumulator.todos[accumulator.currentTopic] = todos;
        }
    }

    const isToolUse = message.role === 'assistant' && message.content instanceof Array &&
        _.some(message.content as Array<ContentBlockParam>, c => c.type === 'tool_use');
    if (isToolUse) {
        const toolUseContent: ToolUseBlockParam[] = message.content.filter((c: ContentBlockParam) => c.type === 'tool_use') as ToolUseBlockParam[];
        for (const toolUse of toolUseContent) {
            if (toolUse.name === 'Read' ||
                toolUse.name === 'Write' ||
                toolUse.name === 'Edit') {
                const path = toolUse.input?.file_path;
                if (path) {
                    if (!accumulator.touchedFiles.includes(path)) {
                        accumulator.touchedFiles.push(path);
                    }
                }
            }

            if (toolUse.name === 'Write' ||
                toolUse.name === 'Edit') {
                if (!accumulator.seenChangeToolsExecutions.has(hashState)) {
                    accumulator.seenChangeToolsExecutions.add(hashState);
                    accumulator.changeToolsExecutions.push(message);
                }
            }
        }
    }

    const isUserMessage = message.role === 'user' && typeof message.content === 'string' && message.content !== 'quota';
    const isPolicySpec = isUserMessage
        && (message.content as string).startsWith('<policy_spec>');
    const isUserResponseInCommand = isUserMessage
        && (message.content as string).startsWith('Command:')
        && (message.content as string).includes('Output:');
    if (isUserMessage && !isUserResponseInCommand && !isPolicySpec) {
        if (!accumulator.seenUserMessages.has(hashState)) {
            accumulator.seenUserMessages.add(hashState);
            accumulator.userMessages.push(message);
        }
    }

    const isAssistantSingleText = message.role === 'assistant' &&
        message.content instanceof Array &&
        message.content.length === 1 &&
        message.content[0].type === 'text' &&
        typeof message.content[0].text === 'string' &&
        message.content[0].text !== 'A';
    const shouldAddImportant = isUserMessage ||
        isAssistantNewTopic ||
        isAssistantUpdateToDo ||
        isAssistantSingleText;
    if (shouldAddImportant) {
        if (!accumulator.seenImportantMessages.has(hashState)) {
            accumulator.seenImportantMessages.add(hashState);
            accumulator.importantMessages.push(message);
        }
    }
}

export async function processRequest(bucket: R2Bucket,
                                     accumulator: Accumulator,
                                     analytics: WorkSessionAnalytics,
                                     request: ProviderRequests) {
    const requestDate = request.receivedAt.toISOString().substring(0, 10);
    const basePath = `provider-requests/${request.tenantId}/${request.proxyId}/${requestDate}`;
    const requestBodyPath = `${basePath}/${request.generatedId}/request.body`;

    try {
        // Get request body from R2 bucket
        const requestBodyObj = await bucket.get(requestBodyPath);
        if (!requestBodyObj) {
            console.warn(`Request body not found for ${requestBodyPath}`);
            return;
        }

        const requestBodyText = await requestBodyObj.text();
        if (!requestBodyText) {
            console.warn(`Request body is empty for ${requestBodyPath}`);
            return;
        }

        const requestData: MessageCreateParamsStreaming = JSON.parse(requestBodyText) as MessageCreateParamsStreaming;

        analytics.totalRequests++;

        // Extract tool usage from Claude messages
        if (requestData.messages && Array.isArray(requestData.messages)) {
            for (const message of requestData.messages) {
                if (Array.isArray(message.content)) {
                    for (const c of message.content) {
                        delete c.cache_control;
                    }
                }
                tryAddMessage(message, accumulator);

                if (message.content && Array.isArray(message.content)) {
                    for (const rawContent of message.content) {
                        if (rawContent.type === 'tool_use' && rawContent.name) {
                            const content = rawContent as ToolUseBlockParam;

                            const existingTool = analytics.toolUsage.find((tool: ToolUsage) => tool.id === content.id);
                            if (!existingTool) {
                                analytics.toolUsage.push({
                                    name: content.name,
                                    id: content.id,
                                    count: 1
                                });
                            }

                            analytics.totalTools = analytics.toolUsage.length;
                        }
                    }
                }
            }
        }

        // Read response body
        const responseBodyPath = `${basePath}/${request.generatedId}/response.body`;
        try {
            const responseBodyObj = await bucket.get(responseBodyPath);
            if (responseBodyObj) {
                const responseBodyText = await responseBodyObj.text();
                if (responseBodyText) {
                    if (responseBodyText.startsWith('event: ')) {
                        // Process streaming response (Server-Sent Events format)
                        const message = parseServerSentEvents(responseBodyText);
                        if (message.start) {
                            tryAddMessage(message.message, accumulator);
                            accumulator.usages.push({
                                usage: message.start.message.usage,
                                model: message.start.message.model || 'unknown'
                            });
                        }
                    } else {
                        const responseData: Message = JSON.parse(responseBodyText);
                        const message = {
                            role: responseData.role,
                            content: responseData.content || []
                        };
                        tryAddMessage(message, accumulator);
                        accumulator.usages.push({
                            usage: responseData.usage,
                            model: responseData.model || 'unknown'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn(`Error reading response body for request ${request.generatedId}:`, error);
        }

    } catch (error) {
        console.error(`Error processing request ${request.generatedId}:`, error);
    }
}
