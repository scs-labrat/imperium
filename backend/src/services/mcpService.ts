import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { ToolDeclaration } from "./llm/ILLMProvider.js";

// Global client instance
let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

/**
 * Initializes the connection to an external MCP server.
 * 
 * @param command The executable command (e.g., 'node', 'python', 'npx')
 * @param args Arguments for the command (e.g., ['./server.js', '-m', 'sqlite'])
 */
export const connectToMcpServer = async (command: string, args: string[] = []) => {
    if (mcpClient) {
        console.log("MCP Client already connected.");
        return;
    }

    console.log(`Connecting to MCP Server: ${command} ${args.join(' ')}`);

    try {
        transport = new StdioClientTransport({
            command,
            args,
        });

        mcpClient = new Client({
            name: "ImperiumC2-Backend",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {}, // Signal that we want to consume tools
            },
        });

        await mcpClient.connect(transport);
        console.log("Successfully connected to MCP Server.");
    } catch (error) {
        console.error("Failed to connect to MCP Server:", error);
        mcpClient = null;
        throw error;
    }
};

/**
 * Lists available tools from the connected MCP server and converts them
 * into the Google Generative AI 'FunctionDeclaration' format.
 */
export const getMcpToolsAsGemini = async (): Promise<FunctionDeclaration[]> => {
    if (!mcpClient) {
        throw new Error("MCP Client not connected.");
    }

    const result = await mcpClient.listTools();
    
    return result.tools.map(tool => {
        // Basic mapping from JSON Schema to Gemini Schema
        // Note: Gemini's schema is a subset of JSON Schema. 
        // Complex nested schemas might need deeper conversion logic.
        const geminiParameters: any = {
            type: SchemaType.OBJECT,
            properties: {},
            required: tool.inputSchema.required || []
        };

        if (tool.inputSchema.properties) {
            for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
                const p = prop as any;
                geminiParameters.properties[key] = {
                    type: mapJsonTypeToGeminiType(p.type),
                    description: p.description
                };
            }
        }

        return {
            name: tool.name,
            description: tool.description || "",
            parameters: geminiParameters
        };
    });
};

/**
 * Lists available tools from the connected MCP server in the generic ToolDeclaration format
 * compatible with any ILLMProvider (Anthropic, etc.).
 */
export const getMcpTools = async (): Promise<ToolDeclaration[]> => {
    if (!mcpClient) {
        throw new Error("MCP Client not connected.");
    }

    const result = await mcpClient.listTools();

    return result.tools.map(tool => ({
        name: tool.name,
        description: tool.description || "",
        parameters: {
            type: "object",
            properties: tool.inputSchema.properties || {},
            required: tool.inputSchema.required || []
        }
    }));
};

/**
 * Calls a specific tool on the MCP server.
 */
export const callMcpTool = async (name: string, args: any) => {
    if (!mcpClient) {
        throw new Error("MCP Client not connected.");
    }

    console.log(`Calling MCP Tool: ${name}`);
    const result = await mcpClient.callTool({
        name,
        arguments: args
    });

    // MCP returns content blocks (text, image, resource). 
    // For now, we serialize the whole result to JSON for the LLM.
    return JSON.stringify(result);
};

// --- Helper: Map types ---
function mapJsonTypeToGeminiType(jsonType: string): SchemaType {
    switch (jsonType?.toLowerCase()) {
        case 'string': return SchemaType.STRING;
        case 'number': 
        case 'integer': return SchemaType.NUMBER;
        case 'boolean': return SchemaType.BOOLEAN;
        case 'array': return SchemaType.ARRAY;
        case 'object': return SchemaType.OBJECT;
        default: return SchemaType.STRING; // Fallback
    }
}
