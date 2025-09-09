import {WorkSessionAnalytics} from "@/analytics/schemas";
import Anthropic from "@anthropic-ai/sdk";

import _ from "lodash";
import {Accumulator} from "./accumulator";
import {callAnthropic, convolutionCall} from "./anthropic-client";

export async function summarize(anthropic: Anthropic,
                                analytics: WorkSessionAnalytics,
                                accumulator: Accumulator) {
    if (accumulator.messages.length === 0) {
        return;
    }

    const summaryPrompt = `Please provide a concise summary of the following conversation messages, 
                        focusing on key topics, decisions, and outcomes. Conversation is ai codding assistant log.
                        If you can not summarize it, return empty string.
                        Do not add your thoughts, Discourse markers / framing statements or boilerplate framing sentences, just return summary.
                        Return summary in a form which can be copy/pasted to issue tracker as is.
                        Return in markdown format. Use only header 2 and header 3 for structure.
                        
                        # summary of previous part:
                        {previousPart}
                        
                        # conversation to summarize:
                        {nextPart}`;
    analytics.summary = await convolutionCall(anthropic, summaryPrompt, accumulator.importantMessages);

    const typePrompt = `Please classify this conversation with ai coding assistant.
                        Return only type of conversation, nothing else.
                        Return several types if conversation is complex, use ; as separator.
                        Focus more on what user is trying to achieve, not on what ai is doing.
                        If you can not find classify, return empty string.
                        Use only conversation types from the list below, do not invent new types.
                        
                        Conversation types:
                        Bug fixing
                        Writing new code
                        Refactoring existing code
                        Help with debugging
                        Exploring new libraries/tools
                        Learning new concepts
                        Designing system architecture
                        Writing tests
                        Improving performance
                        Writing documentation
                        Executing automation tasks
                        Updating dependencies
                        Code review
                        Designing user interfaces
                        Implementing UI components
                        Improving CI/CD pipelines
                        Changing infrastructure
                        
                        # classification for previous part:
                        {previousPart}
                        
                        # conversation:
                        {nextPart}`;
    analytics.type = await convolutionCall(anthropic, typePrompt, accumulator.importantMessages);

    analytics.title = await callAnthropic(anthropic,
        `Please provide a title for this summary of ai coding assistant conversation. 
Return only the title, no other text. Use PR style title. Short but with focus on what was done.
Do not use 'AI Coding Assistant:' or other prefixes. If you can not find title, return empty string.
Do not add your thoughts, Discourse markers / framing statements or boilerplate framing sentences, just return title.
Title must be in a past tense.

                        # summary:
                        ${analytics.summary}`);

    if (0 < accumulator.touchedFiles.length) {
        const rawProject = await callAnthropic(anthropic,
            `Please extract project name from touched files on disk, if multiple projects use ; as separator. Project name is usually folder name.
        Return project name(s) only, no other text. If you can not find project name, return empty string.
        
                        # claude.md file:
                        ${accumulator.claudeMdFile || 'empty'}
        
                        # touched files:
                        ${accumulator.touchedFiles.join(',')}`);
        const projects = rawProject.split(';');
        analytics.projects = _.filter(projects, p => !!p.trim());
    }

    for (const topicMessages of Object.entries(accumulator.topicMessages)) {
        const name = topicMessages[0];
        const messages = topicMessages[1];

        const topicImplementationPrompt = `Extract implementation steps from the ai coding assistant conversation.
    Pay attention to the most important parts, including but no limited to: areas, modules, components, functions,
    user roles, permissions, security, domain knowledge, technology and etc.
    The idea is to extract steps which will be enough to restored changes in the future.
    Return in markdown format. Use only header 2 and header 3 for structure. Use past tense.
    If you can not extract implementation steps, return empty string.
    Result must be in a form which can be assigned as task to developer to re-implement the functionality.
    Do not add your thoughts, Discourse markers / framing statements or boilerplate framing sentences, just return title.
    Do not add questions at the end.
    
    Todo items implemented in the conversation:
    ${JSON.stringify(accumulator.todos[name] ?? {})}
                        
    # implementation steps from previous part:
    {previousPart}
    
    # conversation to find principles:
    {nextPart}`;
        const topicImplementation = await convolutionCall(anthropic, topicImplementationPrompt, messages);
        analytics.topicImplementations[name] = topicImplementation;
    }

    analytics.topics = accumulator.topics;
    analytics.todos = accumulator.todos;

    // Calculate usage per model from accumulator
    const modelUsageMap = new Map<string, { inputTokens: number; outputTokens: number }>();

    for (const usage of accumulator.usages) {
        const model = usage.model || 'unknown';
        const inputTokens = usage.usage?.input_tokens || 0;
        const outputTokens = usage.usage?.output_tokens || 0;

        if (modelUsageMap.has(model)) {
            const existing = modelUsageMap.get(model)!;
            existing.inputTokens += inputTokens;
            existing.outputTokens += outputTokens;
        } else {
            modelUsageMap.set(model, {inputTokens, outputTokens});
        }
    }

    analytics.modelUsage = Array.from(modelUsageMap.entries()).map(([model, usage]) => ({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
    }));

    const totalLength = _.sumBy(accumulator.userMessages, m => m.content.length);
    analytics.averageUserMessageLength = accumulator.userMessages.length > 0 ? totalLength / accumulator.userMessages.length : 0;
}
