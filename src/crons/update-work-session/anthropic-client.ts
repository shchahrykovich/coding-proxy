import Anthropic from "@anthropic-ai/sdk";
import {
    MessageCreateParamsStreaming,
// @ts-expect-error none
} from "@anthropic-ai/sdk/src/resources/messages/messages";

export async function callAnthropic(anthropic: Anthropic, prompt: string) {
    const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1000,
        messages: [{
            role: "user",
            content: prompt
        }]
    });

    if (response.content[0].type === 'text') {
        return response.content[0].text;
    }

    return '';
}

export async function convolutionCall(anthropic: Anthropic, prompt: string, messages: MessageCreateParamsStreaming[]) {
    let result = 'none';
    try {
        let currentContext = '';
        for (const m of messages) {
            const newMessage = JSON.stringify(m);
            if (120000 < currentContext.length + newMessage.length) {

                const finalPrompt = prompt.replace('{previousPart}', result).
                replace('{nextPart}', currentContext);
                result = await callAnthropic(anthropic, finalPrompt);
                currentContext = '';
            } else {
                currentContext += newMessage;
            }
        }

        if (currentContext.length > 0) {
            const finalPrompt = prompt.replace('{previousPart}', result).
            replace('{nextPart}', currentContext);
            result = await callAnthropic(anthropic, finalPrompt);
        }

    } catch (error: any) {
        console.error('Error generating summary:', {
            error,
            m: error.message,
            s: error.stack
        });
        result = '';
    }

    return result;
}
