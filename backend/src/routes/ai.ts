
import { Router } from 'express';
import { generateCode, generateThreatHuntCode, generateLoader, refineCode, chainPayloads, generateShellcode, obfuscateCode, analyzeExecutionLog, analyzeThreatHuntLog, performOsintAnalysis, performAdvancedOsintAnalysis, simulateCode, planMission, applyAnalysisRecommendations, planDefenceMission, generateDetectionRule, optimizeDetectionRule, explainDetectionRule, generateIrPlan, convertKqlToDsl, analyzeSiemResponse } from '../controllers/aiController.js';

const router = Router();

router.post('/generate', generateCode);
router.post('/generate-threat-hunt-code', generateThreatHuntCode);
router.post('/generate-loader', generateLoader);
router.post('/refine-code', refineCode);
router.post('/chain-payloads', chainPayloads);
router.post('/generate-shellcode', generateShellcode);
router.post('/obfuscate-code', obfuscateCode);
router.post('/analyze-execution-log', analyzeExecutionLog);
router.post('/analyze-threat-hunt-log', analyzeThreatHuntLog);
router.post('/perform-osint-analysis', performOsintAnalysis);
router.post('/perform-advanced-osint-analysis', performAdvancedOsintAnalysis);
router.post('/simulate-code-execution', simulateCode);
router.post('/plan-mission', planMission);
router.post('/apply-analysis-recommendations', applyAnalysisRecommendations);
router.post('/plan-defence-mission', planDefenceMission);
router.post('/generate-detection-rule', generateDetectionRule);
router.post('/optimize-detection-rule', optimizeDetectionRule);
router.post('/explain-detection-rule', explainDetectionRule);
router.post('/generate-ir-plan', generateIrPlan);
router.post('/convert-kql-to-dsl', convertKqlToDsl);
router.post('/analyze-siem-response', analyzeSiemResponse);

export default router;
