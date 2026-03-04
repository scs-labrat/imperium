import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import {
    ILLMProvider,
    GenerateOptions,
    ToolDeclaration,
    ToolResponse,
    IChatSession,
    IChatResponse,
    ToolCall
} from "./ILLMProvider.js";

export class GeminiProvider implements ILLMProvider {
    readonly name = "Google Gemini";
    private ai: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        if (!apiKey) {
            throw new Error("Google API key is required");
        }
        this.ai = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }

    async generateContent(prompt: string, options?: GenerateOptions): Promise<string> {
        const model = this.ai.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: options?.temperature,
                maxOutputTokens: options?.maxTokens,
            }
        });

        // If system prompt provided, prepend it
        let fullPrompt = prompt;
        if (options?.systemPrompt) {
            fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    }

    async generateWithTools(
        prompt: string,
        tools: ToolDeclaration[],
        options?: GenerateOptions
    ): Promise<ToolResponse> {
        // Convert our tool declarations to Gemini function declarations
        const functionDeclarations = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }));

        const model = this.ai.getGenerativeModel({
            model: this.modelName,
            tools: [{ functionDeclarations }],
            generationConfig: {
                temperature: options?.temperature,
                maxOutputTokens: options?.maxTokens,
            }
        });

        let fullPrompt = prompt;
        if (options?.systemPrompt) {
            fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;

        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            return {
                toolCalls: functionCalls.map(fc => ({
                    name: fc.name,
                    args: fc.args as Record<string, any>
                }))
            };
        }

        return { text: response.text() };
    }

    startChat(tools?: ToolDeclaration[]): IChatSession {
        let modelConfig: any = { model: this.modelName };

        if (tools && tools.length > 0) {
            const functionDeclarations = tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }));
            modelConfig.tools = [{ functionDeclarations }];
        }

        const model = this.ai.getGenerativeModel(modelConfig);
        const chat = model.startChat();

        return new GeminiChatSession(chat);
    }
}

class GeminiChatSession implements IChatSession {
    private chat: ChatSession;

    constructor(chat: ChatSession) {
        this.chat = chat;
    }

    async sendMessage(message: string): Promise<IChatResponse> {
        const result = await this.chat.sendMessage(message);
        return new GeminiChatResponse(result.response);
    }

    async sendMessageWithToolResults(
        toolResults: Array<{ name: string; result: any }>
    ): Promise<IChatResponse> {
        const parts = toolResults.map(tr => ({
            functionResponse: {
                name: tr.name,
                response: { result: tr.result }
            }
        }));

        const result = await this.chat.sendMessage(parts);
        return new GeminiChatResponse(result.response);
    }
}

class GeminiChatResponse implements IChatResponse {
    private response: any;

    constructor(response: any) {
        this.response = response;
    }

    text(): string {
        return this.response.text();
    }

    functionCalls(): ToolCall[] | undefined {
        const calls = this.response.functionCalls();
        if (calls && calls.length > 0) {
            return calls.map((fc: any) => ({
                name: fc.name,
                args: fc.args as Record<string, any>
            }));
        }
        return undefined;
    }
}
