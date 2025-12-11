import axios from 'axios';
import { GenerationParams, CodeLanguage, ObfuscationTechnique, AttackType, TargetOS, VaultItem, TargetEnvironment, ShellcodeParams, SiemConfig, DetectIQOutput } from '../types';

const API_BASE_URL = 'http://localhost:3001/api/v1/ai';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// --- Wrapper to handle API calls and errors ---
async function handleApiCall<T>(endpoint: string, data: any): Promise<T> {
    try {
        const response = await apiClient.post(endpoint, data);
        return response.data as T;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error(`API Error on ${endpoint}:`, error.response.data);
            throw new Error(error.response.data.message || `Request to ${endpoint} failed`);
        }
        console.error(`Unexpected error on ${endpoint}:`, error);
        throw new Error(`An unexpected error occurred while calling ${endpoint}.`);
    }
}

// --- Ported Functions ---

export const generateCode = async (params: GenerationParams, modelName: string, vulnerabilityDetails?: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate', { params, model: modelName, vulnerabilityDetails });
    return response.text;
};

export const generateThreatHuntCode = async (objective: string, language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate-threat-hunt-code', { objective, language, target, model: modelName });
    return response.text;
};

export const generateLoader = async (payload: string, language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate-loader', { payload, language, target, model: modelName });
    return response.text;
};

export const refineCode = async (code: string, language: CodeLanguage, instruction: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/refine-code', { code, language, instruction, model: modelName });
    return response.text;
};

export const chainPayloads = async (payloads: VaultItem[], language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/chain-payloads', { payloads, language, target, model: modelName });
    return response.text;
};

export const generateShellcode = async (params: ShellcodeParams, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate-shellcode', { params, model: modelName });
    return response.text;
};

export const obfuscateCode = async (code: string, language: CodeLanguage, techniques: ObfuscationTechnique[], level: number, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/obfuscate-code', { code, language, techniques, level, model: modelName });
    return response.text;
};

export const analyzeExecutionLog = async (log: string, code: string, params: GenerationParams, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/analyze-execution-log', { log, code, params, model: modelName });
    return response.text;
};

export const analyzeThreatHuntLog = async (log: string, code: string, params: GenerationParams, modelName: string): Promise<any> => {
    return handleApiCall<any>('/analyze-threat-hunt-log', { log, code, params, model: modelName });
};

export const performOsintAnalysis = async (target: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/perform-osint-analysis', { target, model: modelName });
    return response.text;
};

export const performAdvancedOsintAnalysis = async (target: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/perform-advanced-osint-analysis', { target, model: modelName });
    return response.text;
};

export const analyzeVulnerabilityScan = async (scanData: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/analyze-vulnerability-scan', { scanData, model: modelName });
    return response.text;
};

export const analyzeSpiderfootJson = async (jsonData: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/analyze-spiderfoot-json', { jsonData, model: modelName });
    return response.text;
};

export const analyzeJavaScriptCode = async (jsCode: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/analyze-javascript-code', { jsCode, model: modelName });
    return response.text;
};

export const parseNaturalLanguageCommand = async (command: string, modelName: string): Promise<Partial<GenerationParams & { obfuscationLevel: number; obfuscationTechniques: ObfuscationTechnique[] }> | null> => {
    return handleApiCall<any>('/parse-natural-language-command', { command, model: modelName });
};

export const simulateCodeExecution = async (code: string, params: GenerationParams, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/simulate-code-execution', { code, params, model: modelName });
    return response.text;
};

export const performEvasionAnalysis = async (code: string, language: CodeLanguage, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/perform-evasion-analysis', { code, language, model: modelName });
    return response.text;
};

export const applyAnalysisRecommendations = async (code: string, analysis: string, params: GenerationParams, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/apply-analysis-recommendations', { code, analysis, params, model: modelName });
    return response.text;
};

export const planMission = async (objective: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/plan-mission', { objective, model: modelName });
    return response.text;
};

export const fetchVulnerabilityDetails = async (identifier: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/fetch-vulnerability-details', { identifier, model: modelName });
    return response.text;
};

export const generateExploitFromFinding = async (finding: string, modelName: string): Promise<{ params: Partial<GenerationParams>, code: string }> => {
    return handleApiCall<any>('/generate-exploit-from-finding', { finding, model: modelName });
};

export const planDefenceMission = async (objective: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/plan-defence-mission', { objective, model: modelName });
    return response.text;
};

export const generateValidationPlan = async (objective: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate-validation-plan', { objective, model: modelName });
    return response.text;
};

export const generateDetectionRule = async (inputText: string, ruleType: 'Sigma' | 'YARA' | 'Snort', modelName: string, siemTarget?: 'Splunk' | 'Elastic' | 'MicrosoftXDR' | ''): Promise<DetectIQOutput> => {
    return handleApiCall<DetectIQOutput>('/generate-detection-rule', { inputText, ruleType, model: modelName, siemTarget });
};

export const optimizeDetectionRule = async (existingRule: string, modelName: string): Promise<DetectIQOutput> => {
    return handleApiCall<DetectIQOutput>('/optimize-detection-rule', { existingRule, model: modelName });
};

export const explainDetectionRule = async (rule: string, modelName: string): Promise<DetectIQOutput> => {
    return handleApiCall<DetectIQOutput>('/explain-detection-rule', { rule, model: modelName });
};

export const generateIrPlan = async (objective: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/generate-ir-plan', { objective, model: modelName });
    return response.text;
};

export const convertKqlToDsl = async (kqlQuery: string, variables: Record<string, string>, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/convert-kql-to-dsl', { kqlQuery, variables, model: modelName });
    return response.text;
};

export const analyzeSiemResponse = async (siemResponse: string, modelName: string): Promise<string> => {
    const response = await handleApiCall<{ text: string }>('/analyze-siem-response', { siemResponse, model: modelName });
    return response.text;
};
