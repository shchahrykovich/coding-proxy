export type ToolUsage = {
    name: string;
    id: string;
    count: number;
}

export type ToDoItems = {
    id: string;
    content: string;
    status: string;
}

export type ModelUsage = {
    model: string;
    inputTokens: number;
    outputTokens: number;
}

export type WorkSessionAnalytics = {
    totalRequests: number;
    totalTools: number;
    toolUsage: ToolUsage[];
    summary: string;
    type: string;
    title: string;
    projects: string[];
    topicImplementations: Record<string, string>;
    topics: string[];
    detailedTodos: string[];
    todos: Record<string, ToDoItems[]>;
    modelUsage: ModelUsage[];
    averageUserMessageLength: number;
}

export function createDefaultWorkSessionAnalytics(): WorkSessionAnalytics {
    return {
        totalRequests: 0,
        totalTools: 0,
        toolUsage: [],
        summary: '',
        detailedTodos: [],
        topicImplementations: {},
        type: '',
        title: '',
        averageUserMessageLength: 0,
        topics: [],
        todos: {},
        projects: [],
        modelUsage: [],
    };
}
