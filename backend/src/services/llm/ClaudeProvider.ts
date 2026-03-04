import Anthropic from "@anthropic-ai/sdk";
import {
    ILLMProvider,
    GenerateOptions,
    ToolDeclaration,
    ToolResponse,
    IChatSession,
    IChatResponse,
    ToolCall
} from "./ILLMProvider.js";

export class ClaudeProvider implements ILLMProvider {
    readonly name = "Anthropic Claude";
    private client: Anthropic;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        if (!apiKey) {
            throw new Error("Anthropic API key is required");
        }
        this.client = new Anthropic({ apiKey });
        this.modelName = modelName;
    }

    async generateContent(prompt: string, options?: GenerateOptions): Promise<string> {
        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: options?.maxTokens || 4096,
            system: options?.systemPrompt,
            messages: [
                { role: "user", content: prompt }
            ],
            ...(options?.temperature !== undefined && { temperature: options.temperature })
        });

        // Extract text from response
        const textBlocks = response.content.filter(block => block.type === 'text');
        return textBlocks.map(block => (block as Anthropic.TextBlock).text).join('\n');
    }

    async generateWithTools(
        prompt: string,
        tools: ToolDeclaration[],
        options?: GenerateOptions
    ): Promise<ToolResponse> {
        // Convert our tool declarations to Claude tool format
        const claudeTools: Anthropic.Tool[] = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as Anthropic.Tool.InputSchema
        }));

        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: options?.maxTokens || 4096,
            system: options?.systemPrompt,
            tools: claudeTools,
            messages: [
                { role: "user", content: prompt }
            ],
            ...(options?.temperature !== undefined && { temperature: options.temperature })
        });

        // Check for tool use
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
        if (toolUseBlocks.length > 0) {
            return {
                toolCalls: toolUseBlocks.map(block => {
                    const toolUse = block as Anthropic.ToolUseBlock;
                    return {
                        name: toolUse.name,
                        args: toolUse.input as Record<string, any>
                    };
                })
            };
        }

        // Return text response
        const textBlocks = response.content.filter(block => block.type === 'text');
        return {
            text: textBlocks.map(block => (block as Anthropic.TextBlock).text).join('\n')
        };
    }

    startChat(tools?: ToolDeclaration[]): IChatSession {
        return new ClaudeChatSession(this.client, this.modelName, tools);
    }
}

class ClaudeChatSession implements IChatSession {
    private client: Anthropic;
    private modelName: string;
    private tools?: Anthropic.Tool[];
    private messages: Anthropic.MessageParam[] = [];

    constructor(client: Anthropic, modelName: string, tools?: ToolDeclaration[]) {
        this.client = client;
        this.modelName = modelName;
        if (tools) {
            this.tools = tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters as Anthropic.Tool.InputSchema
            }));
        }
    }

    async sendMessage(message: string): Promise<IChatResponse> {
        this.messages.push({ role: "user", content: message });

        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: 4096,
            tools: this.tools,
            messages: this.messages
        });

        // Add assistant response to history
        this.messages.push({ role: "assistant", content: response.content });

        return new ClaudeChatResponse(response);
    }

    async sendMessageWithToolResults(
        toolResults: Array<{ name: string; result: any }>
    ): Promise<IChatResponse> {
        // Claude expects tool results as a user message with tool_result blocks
        const toolResultContent: Anthropic.ToolResultBlockParam[] = toolResults.map(tr => ({
            type: "tool_result" as const,
            tool_use_id: tr.name, // Note: In real usage, you'd track the actual tool_use_id
            content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result)
        }));

        this.messages.push({ role: "user", content: toolResultContent });

        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: 4096,
            tools: this.tools,
            messages: this.messages
        });

        this.messages.push({ role: "assistant", content: response.content });

        return new ClaudeChatResponse(response);
    }
}

class ClaudeChatResponse implements IChatResponse {
    private response: Anthropic.Message;

    constructor(response: Anthropic.Message) {
        this.response = response;
    }

    text(): string {
        const textBlocks = this.response.content.filter(block => block.type === 'text');
        return textBlocks.map(block => (block as Anthropic.TextBlock).text).join('\n');
    }

    functionCalls(): ToolCall[] | undefined {
        const toolUseBlocks = this.response.content.filter(block => block.type === 'tool_use');
        if (toolUseBlocks.length > 0) {
            return toolUseBlocks.map(block => {
                const toolUse = block as Anthropic.ToolUseBlock;
                return {
                    name: toolUse.name,
                    args: toolUse.input as Record<string, any>
                };
            });
        }
        return undefined;
    }
}
