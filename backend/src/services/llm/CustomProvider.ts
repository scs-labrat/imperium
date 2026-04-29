import {
    ILLMProvider,
    GenerateOptions,
    ToolDeclaration,
    ToolResponse,
    IChatSession,
    IChatResponse,
    ToolCall
} from "./ILLMProvider.js";

/**
 * OpenAI-compatible LLM provider.
 * Works with any API that implements the OpenAI chat completions format:
 * - OpenAI
 * - Ollama
 * - LM Studio
 * - vLLM
 * - OpenRouter
 * - Together AI
 * - Groq
 * - Any OpenAI-compatible endpoint
 */
export class CustomProvider implements ILLMProvider {
    readonly name = "Custom LLM";
    private apiKey: string;
    private modelName: string;
    private baseUrl: string;

    constructor(apiKey: string, modelName: string, baseUrl: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        // Normalize: ensure base URL doesn't end with /
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    private get headers(): Record<string, string> {
        const h: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            h['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return h;
    }

    private get completionsUrl(): string {
        // If the URL already ends with /chat/completions, use as-is
        if (this.baseUrl.endsWith('/chat/completions')) {
            return this.baseUrl;
        }
        // If it ends with /v1, append /chat/completions
        if (this.baseUrl.endsWith('/v1')) {
            return `${this.baseUrl}/chat/completions`;
        }
        // Otherwise append /v1/chat/completions
        return `${this.baseUrl}/v1/chat/completions`;
    }

    async generateContent(prompt: string, options?: GenerateOptions): Promise<string> {
        const messages: any[] = [];
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const body: any = {
            model: this.modelName,
            messages,
            max_tokens: options?.maxTokens || 4096,
        };
        if (options?.temperature !== undefined) {
            body.temperature = options.temperature;
        }

        const response = await fetch(this.completionsUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom LLM API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    async generateWithTools(
        prompt: string,
        tools: ToolDeclaration[],
        options?: GenerateOptions
    ): Promise<ToolResponse> {
        const messages: any[] = [];
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        // Convert to OpenAI tool format
        const openaiTools = tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            }
        }));

        const body: any = {
            model: this.modelName,
            messages,
            tools: openaiTools,
            max_tokens: options?.maxTokens || 4096,
        };
        if (options?.temperature !== undefined) {
            body.temperature = options.temperature;
        }

        const response = await fetch(this.completionsUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom LLM API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (choice?.message?.tool_calls?.length > 0) {
            return {
                toolCalls: choice.message.tool_calls.map((tc: any) => ({
                    name: tc.function.name,
                    args: JSON.parse(tc.function.arguments || '{}'),
                }))
            };
        }

        return { text: choice?.message?.content || '' };
    }

    startChat(tools?: ToolDeclaration[]): IChatSession {
        return new CustomChatSession(
            this.completionsUrl,
            this.headers,
            this.modelName,
            tools
        );
    }
}

class CustomChatSession implements IChatSession {
    private url: string;
    private headers: Record<string, string>;
    private modelName: string;
    private tools?: any[];
    private messages: any[] = [];

    constructor(
        url: string,
        headers: Record<string, string>,
        modelName: string,
        tools?: ToolDeclaration[]
    ) {
        this.url = url;
        this.headers = headers;
        this.modelName = modelName;
        if (tools) {
            this.tools = tools.map(tool => ({
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                }
            }));
        }
    }

    async sendMessage(message: string): Promise<IChatResponse> {
        this.messages.push({ role: 'user', content: message });

        const body: any = {
            model: this.modelName,
            messages: this.messages,
            max_tokens: 4096,
        };
        if (this.tools) {
            body.tools = this.tools;
        }

        const response = await fetch(this.url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom LLM API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const assistantMsg = data.choices?.[0]?.message;
        this.messages.push(assistantMsg);

        return new CustomChatResponse(data);
    }

    async sendMessageWithToolResults(
        toolResults: Array<{ name: string; result: any }>
    ): Promise<IChatResponse> {
        // OpenAI format: tool results as separate messages
        for (const tr of toolResults) {
            this.messages.push({
                role: 'tool',
                tool_call_id: tr.name,
                content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
            });
        }

        const body: any = {
            model: this.modelName,
            messages: this.messages,
            max_tokens: 4096,
        };
        if (this.tools) {
            body.tools = this.tools;
        }

        const response = await fetch(this.url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom LLM API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const assistantMsg = data.choices?.[0]?.message;
        this.messages.push(assistantMsg);

        return new CustomChatResponse(data);
    }
}

class CustomChatResponse implements IChatResponse {
    private data: any;

    constructor(data: any) {
        this.data = data;
    }

    text(): string {
        return this.data.choices?.[0]?.message?.content || '';
    }

    functionCalls(): ToolCall[] | undefined {
        const toolCalls = this.data.choices?.[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            return toolCalls.map((tc: any) => ({
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments || '{}'),
            }));
        }
        return undefined;
    }
}
