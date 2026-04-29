import { Request, Response } from 'express';
import * as aiService from '../services/aiService.js';
import { setCustomLLMConfig, getCustomLLMConfig } from '../services/llm/index.js';

export const saveCustomLLMConfig = async (req: Request, res: Response) => {
    try {
        const { apiEndpoint, apiKey, modelName } = req.body;
        if (!apiEndpoint || !modelName) {
            res.status(400).json({ message: 'apiEndpoint and modelName are required' });
            return;
        }
        setCustomLLMConfig({ apiEndpoint, apiKey: apiKey || '', modelName });
        res.json({ success: true, message: 'Custom LLM configuration saved' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving custom LLM config' });
    }
};

export const getCustomLLMConfigRoute = async (_req: Request, res: Response) => {
    try {
        const config = getCustomLLMConfig();
        if (!config) {
            res.json({ configured: false });
            return;
        }
        // Don't send full API key back - mask it
        res.json({
            configured: true,
            apiEndpoint: config.apiEndpoint,
            modelName: config.modelName,
            apiKeySet: !!config.apiKey,
            apiKeyPreview: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '',
        });
    } catch (error) {
        res.status(500).json({ message: 'Error getting custom LLM config' });
    }
};

export const deleteCustomLLMConfig = async (_req: Request, res: Response) => {
    try {
        setCustomLLMConfig(null);
        res.json({ success: true, message: 'Custom LLM configuration removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting custom LLM config' });
    }
};

export const testCustomLLMConfig = async (req: Request, res: Response) => {
    try {
        const { apiEndpoint, apiKey, modelName } = req.body;
        if (!apiEndpoint || !modelName) {
            res.status(400).json({ message: 'apiEndpoint and modelName are required' });
            return;
        }
        // Temporarily set config, test, then restore previous
        const previousConfig = getCustomLLMConfig();
        setCustomLLMConfig({ apiEndpoint, apiKey: apiKey || '', modelName });
        try {
            const { CustomProvider } = await import('../services/llm/CustomProvider.js');
            const provider = new CustomProvider(apiKey || '', modelName, apiEndpoint);
            const result = await provider.generateContent('Say "Connection successful!" in exactly those words.');
            res.json({ success: true, response: result.substring(0, 200) });
        } catch (testError: any) {
            res.json({ success: false, error: testError.message });
        } finally {
            // Restore previous config if test was ad-hoc
            setCustomLLMConfig(previousConfig);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error testing custom LLM config' });
    }
};

export const generateCode = async (req: Request, res: Response) => {
    try {
        const { params, model } = req.body;
        const result = await aiService.generateCode(params, model || 'gemini-2.5-pro', '');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating code' });
    }
};

export const generateThreatHuntCode = async (req: Request, res: Response) => {
    try {
        const { objective, language, target, model } = req.body;
        const result = await aiService.generateThreatHuntCode(objective, language, target, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating threat hunt code' });
    }
};

export const generateLoader = async (req: Request, res: Response) => {
    try {
        const { payload, language, target, model } = req.body;
        const result = await aiService.generateLoader(payload, language, target, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating loader' });
    }
};

export const refineCode = async (req: Request, res: Response) => {
    try {
        const { code, language, instruction, model } = req.body;
        const result = await aiService.refineCode(code, language, instruction, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error refining code' });
    }
};

export const chainPayloads = async (req: Request, res: Response) => {
    try {
        const { payloads, language, target, model } = req.body;
        const result = await aiService.chainPayloads(payloads, language, target, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error chaining payloads' });
    }
};

export const generateShellcode = async (req: Request, res: Response) => {
    try {
        const { params, model } = req.body;
        const result = await aiService.generateShellcode(params, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating shellcode' });
    }
};

export const obfuscateCode = async (req: Request, res: Response) => {
    try {
        const { code, language, techniques, level, model } = req.body;
        const result = await aiService.obfuscateCode(code, language, techniques, level, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error obfuscating code' });
    }
};

export const analyzeExecutionLog = async (req: Request, res: Response) => {
    try {
        const { log, code, params, model } = req.body;
        const result = await aiService.analyzeExecutionLog(log, code, params, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error analyzing execution log' });
    }
};

export const analyzeThreatHuntLog = async (req: Request, res: Response) => {
    try {
        const { log, code, params, model } = req.body;
        const result = await aiService.analyzeThreatHuntLog(log, code, params, model || 'gemini-2.5-pro');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error analyzing threat hunt log' });
    }
};

export const performOsintAnalysis = async (req: Request, res: Response) => {
    try {
        const { target, model } = req.body;
        const result = await aiService.performOsintAnalysis(target, model || 'gemini-2.5-flash');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error performing OSINT analysis' });
    }
};


export const performAdvancedOsintAnalysis = async (req: Request, res: Response) => {
    try {
        const { target, model } = req.body;
        const result = await aiService.performAdvancedOsintAnalysis(target, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: "Error performing Advanced OSINT analysis" });
    }
};

export const analyzeVulnerabilityScan = async (req: Request, res: Response) => {
    console.log('Received request to analyze vulnerability scan:', req.body);
    try {
        const { scanData, model } = req.body;
        const result = await aiService.analyzeVulnerabilityScan(scanData, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error analyzing vulnerability scan' });
    }
};

export const simulateCode = async (req: Request, res: Response) => {
    try {
        const { code, params, model } = req.body;
        const result = await aiService.simulateCodeExecution(code, params, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error simulating code execution' });
    }
};

export const planMission = async (req: Request, res: Response) => {
    try {
        const { objective, model } = req.body;
        const result = await aiService.planMission(objective, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error planning mission' });
    }
};

export const applyAnalysisRecommendations = async (req: Request, res: Response) => {
    try {
        const { code, analysis, params, model } = req.body;
        const result = await aiService.applyAnalysisRecommendations(code, analysis, params, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error applying analysis recommendations' });
    }
};

export const planDefenceMission = async (req: Request, res: Response) => {
    try {
        const { objective, model } = req.body;
        const result = await aiService.planDefenceMission(objective, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error planning defence mission' });
    }
};

export const generateValidationPlan = async (req: Request, res: Response) => {
    try {
        const { objective, model } = req.body;
        const result = await aiService.generateValidationPlan(objective, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating validation plan' });
    }
};

export const generateDetectionRule = async (req: Request, res: Response) => {
    try {
        const { inputText, ruleType, siemTarget, model } = req.body;
        const result = await aiService.generateDetectionRule(inputText, ruleType, model || 'gemini-2.5-pro', siemTarget);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error generating detection rule' });
    }
};

export const optimizeDetectionRule = async (req: Request, res: Response) => {
    try {
        const { existingRule, model } = req.body;
        const result = await aiService.optimizeDetectionRule(existingRule, model || 'gemini-2.5-pro');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error optimizing detection rule' });
    }
};

export const explainDetectionRule = async (req: Request, res: Response) => {
    try {
        const { rule, model } = req.body;
        const result = await aiService.explainDetectionRule(rule, model || 'gemini-2.5-pro');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error explaining detection rule' });
    }
};

export const generateIrPlan = async (req: Request, res: Response) => {
    try {
        const { objective, model } = req.body;
        const result = await aiService.generateIrPlan(objective, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating IR plan' });
    }
};

export const generateIrTabletopScenario = async (req: Request, res: Response) => {
    try {
        const { objective, model } = req.body;
        const result = await aiService.generateIrTabletopScenario(objective, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error generating IR tabletop scenario' });
    }
};

export const convertKqlToDsl = async (req: Request, res: Response) => {
    try {
        const { kqlQuery, variables, model } = req.body;
        const result = await aiService.convertKqlToDsl(kqlQuery, variables, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error converting KQL to DSL' });
    }
};

export const analyzeSiemResponse = async (req: Request, res: Response) => {
    try {
        const { siemResponse, model } = req.body;
        const result = await aiService.analyzeSiemResponse(siemResponse, model || 'gemini-2.5-pro');
        res.json({ text: result });
    } catch (error) {
        res.status(500).json({ message: 'Error analyzing SIEM response' });
    }
};