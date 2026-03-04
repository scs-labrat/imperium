/**
 * Interface for LLM providers
 * Abstracts the common operations needed from any LLM service
 */

export interface GenerateOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ToolDeclaration {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface ToolCall {
    name: string;
    args: Record<string, any>;
}

export interface ToolResponse {
    text?: string;
    toolCalls?: ToolCall[];
}

export interface IChatSession {
    sendMessage(message: string): Promise<IChatResponse>;
    sendMessageWithToolResults(toolResults: Array<{ name: string; result: any }>): Promise<IChatResponse>;
}

export interface IChatResponse {
    text(): string;
    functionCalls(): ToolCall[] | undefined;
}

export interface ILLMProvider {
    readonly name: string;

    /**
     * Generate content from a prompt
     */
    generateContent(prompt: string, options?: GenerateOptions): Promise<string>;

    /**
     * Generate content with tool/function calling support
     */
    generateWithTools?(
        prompt: string,
        tools: ToolDeclaration[],
        options?: GenerateOptions
    ): Promise<ToolResponse>;

    /**
     * Start a multi-turn chat session
     */
    startChat?(tools?: ToolDeclaration[]): IChatSession;
}
