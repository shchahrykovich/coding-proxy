import {
    MessageCreateParamsStreaming,
// @ts-expect-error none
} from "@anthropic-ai/sdk/src/resources/messages/messages";
// @ts-expect-error none
import { Usage } from "@anthropic-ai/sdk/client";
import {ToDoItems} from "@/analytics/schemas";

export type Accumulator = {
    messages: MessageCreateParamsStreaming[];
    seenMessages: Set<string>;

    importantMessages: MessageCreateParamsStreaming[];
    seenImportantMessages: Set<string>;

    userMessages: MessageCreateParamsStreaming[];
    seenUserMessages: Set<string>;

    topics: string[];
    currentTopic: string;
    currentTopicMessages: MessageCreateParamsStreaming[];
    seenCurrentTopicMessages: Set<string>;
    topicMessages: Record<string, MessageCreateParamsStreaming[]>;

    todos: Record<string, ToDoItems[]>;

    touchedFiles: string[];

    claudeMdFile: string;

    changeToolsExecutions: MessageCreateParamsStreaming[];
    seenChangeToolsExecutions: Set<string>;

    usages: {
        usage: Usage
        model: string,
    }[];
}

export function createDefaultAccumulator(): Accumulator {
    return {
        messages: [],
        seenMessages: new Set<string>(),
        userMessages: [],
        seenUserMessages: new Set<string>(),
        importantMessages: [],
        seenImportantMessages: new Set<string>(),
        topics: [],
        currentTopic: '',
        claudeMdFile: '',
        usages: [],
        todos: {},
        touchedFiles: [],
        changeToolsExecutions: [],
        seenChangeToolsExecutions: new Set<string>(),
        currentTopicMessages: [],
        seenCurrentTopicMessages: new Set<string>(),
        topicMessages: {},
    }
}
