import { Request, Response } from 'express';
import * as aiService from '../services/aiService.js';

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