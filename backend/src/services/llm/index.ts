import { LLMProvider } from "../../types/index.js";
import { ILLMProvider } from "./ILLMProvider.js";
import { GeminiProvider } from "./GeminiProvider.js";
import { ClaudeProvider } from "./ClaudeProvider.js";
import { CustomProvider } from "./CustomProvider.js";

export * from "./ILLMProvider.js";
export { GeminiProvider } from "./GeminiProvider.js";
export { ClaudeProvider } from "./ClaudeProvider.js";
export { CustomProvider } from "./CustomProvider.js";

/**
 * In-memory custom LLM configuration.
 * Persists for the lifetime of the backend process.
 */
interface CustomLLMConfig {
    apiEndpoint: string;
    apiKey: string;
    modelName: string;
}

let customLLMConfig: CustomLLMConfig | null = null;

export function setCustomLLMConfig(config: CustomLLMConfig | null): void {
    customLLMConfig = config;
}

export function getCustomLLMConfig(): CustomLLMConfig | null {
    return customLLMConfig;
}

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

        case LLMProvider.CUSTOM:
            if (!customLLMConfig) {
                throw new Error("Custom LLM not configured. Go to Settings > LLM Configuration to set it up.");
            }
            return new CustomProvider(
                customLLMConfig.apiKey,
                customLLMConfig.modelName,
                customLLMConfig.apiEndpoint
            );

        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

/**
 * Get provider from model name (auto-detect provider)
 * Model names:
 * - Claude 4.x: claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5-20251001
 * - Gemini: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-latest
 * - Custom: custom:* (any model name prefixed with "custom:")
 */
export function getProviderFromModel(modelName: string): ILLMProvider {
    if (modelName.startsWith('claude')) {
        return getProvider(LLMProvider.ANTHROPIC, modelName);
    } else if (modelName.startsWith('gemini')) {
        return getProvider(LLMProvider.GOOGLE, modelName);
    } else if (modelName.startsWith('custom:')) {
        // "custom:my-model" → uses saved custom config, overrides model name if different
        if (!customLLMConfig) {
            throw new Error("Custom LLM not configured. Go to Settings > LLM Configuration to set it up.");
        }
        return new CustomProvider(
            customLLMConfig.apiKey,
            customLLMConfig.modelName,
            customLLMConfig.apiEndpoint
        );
    } else if (customLLMConfig && modelName === customLLMConfig.modelName) {
        // Direct match against stored custom model name
        return new CustomProvider(
            customLLMConfig.apiKey,
            customLLMConfig.modelName,
            customLLMConfig.apiEndpoint
        );
    } else {
        // Default to Claude
        console.warn(`Unknown model prefix for "${modelName}", defaulting to Claude`);
        return getProvider(LLMProvider.ANTHROPIC, 'claude-sonnet-4-6');
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
        case LLMProvider.CUSTOM:
            return !!customLLMConfig;
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
