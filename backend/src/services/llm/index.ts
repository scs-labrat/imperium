import { LLMProvider } from "../../types/index.js";
import { ILLMProvider } from "./ILLMProvider.js";
import { GeminiProvider } from "./GeminiProvider.js";
import { ClaudeProvider } from "./ClaudeProvider.js";

export * from "./ILLMProvider.js";
export { GeminiProvider } from "./GeminiProvider.js";
export { ClaudeProvider } from "./ClaudeProvider.js";

/**
 * Get the appropriate LLM provider based on configuration
 */
export function getProvider(provider: LLMProvider, modelName: string): ILLMProvider {
    switch (provider) {
        case LLMProvider.GOOGLE:
            const googleApiKey = process.env.API_KEY;
            if (!googleApiKey) {
                throw new Error("API_KEY environment variable not set for Google Gemini");
            }
            return new GeminiProvider(googleApiKey, modelName);

        case LLMProvider.ANTHROPIC:
            const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicApiKey) {
                throw new Error("ANTHROPIC_API_KEY environment variable not set for Anthropic Claude");
            }
            return new ClaudeProvider(anthropicApiKey, modelName);

        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

/**
 * Get provider from model name (auto-detect provider)
 * Model names:
 * - Gemini: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-latest
 * - Claude: claude-sonnet-4-20250514, claude-opus-4-5-20251101
 */
export function getProviderFromModel(modelName: string): ILLMProvider {
    if (modelName.startsWith('gemini')) {
        return getProvider(LLMProvider.GOOGLE, modelName);
    } else if (modelName.startsWith('claude')) {
        return getProvider(LLMProvider.ANTHROPIC, modelName);
    } else {
        // Default to Gemini for backwards compatibility
        console.warn(`Unknown model prefix for "${modelName}", defaulting to Gemini`);
        return getProvider(LLMProvider.GOOGLE, modelName);
    }
}

/**
 * Check if a provider's API key is configured
 */
export function isProviderConfigured(provider: LLMProvider): boolean {
    switch (provider) {
        case LLMProvider.GOOGLE:
            return !!process.env.API_KEY;
        case LLMProvider.ANTHROPIC:
            return !!process.env.ANTHROPIC_API_KEY;
        default:
            return false;
    }
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): LLMProvider[] {
    return Object.values(LLMProvider).filter(provider =>
        isProviderConfigured(provider as LLMProvider)
    ) as LLMProvider[];
}
