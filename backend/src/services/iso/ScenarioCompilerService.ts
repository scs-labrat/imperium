import { v4 as uuidv4 } from 'uuid';
import { getProviderFromModel } from '../llm/index.js';
import { isoService } from './ISOService.js';
import type {
    ScenarioDefinition,
    CompiledScenario,
    ExecutiveLayerAssets,
    SOCIRLayerAssets,
    OTLayerAssets,
    LegalCommsLayerAssets,
    Inject,
    SyntheticEvidence,
    ScoringRubric,
    BranchingRule,
    DecisionCard,
    DecisionOption,
    RiskProjection,
    ExecutiveMetric,
    VisibilityGap,
    QuerySimulation,
    InvestigationTemplate,
    ToolRecommendation,
    OTProcessModel,
    SafetyChain,
    OperatorFrictionScenario,
    OTSystemState,
    OTImpactScenario,
    NotificationClock,
    RegulatorThreshold,
    CommsDraft,
    LanguageLintingRule,
    StakeholderEntry,
    ScoringCategory,
} from '../../types/iso.js';
import {
    ExerciseStatus,
    ISORole,
    EvidenceType,
    EvidenceIntegrity,
    InjectStatus,
} from '../../types/iso.js';

/**
 * ScenarioCompilerService - LLM-powered scenario compilation
 * Generates all layer-specific assets from a scenario definition
 */
class ScenarioCompilerService {
    private cleanJsonResponse(text: string): any {
        // Try to find JSON in markdown code block
        const jsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
        const match = text.match(jsonRegex);
        try {
            if (match && match[1]) {
                return JSON.parse(match[1].trim());
            }
            // Try parsing the whole response
            return JSON.parse(text.trim());
        } catch (error) {
            console.error("Error parsing JSON response:", error);
            console.error("Raw response:", text.substring(0, 500));
            throw new Error("Failed to parse JSON response from AI.");
        }
    }

    /**
     * Compile a scenario definition into a full compiled scenario
     */
    async compile(scenarioId: string, modelName: string): Promise<CompiledScenario> {
        const definition = isoService.getScenario(scenarioId);
        if (!definition) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }

        console.log(`[ISO] Starting scenario compilation for: ${definition.name}`);
        console.log(`[ISO] Using model: ${modelName}`);

        // Generate each layer in sequence (to manage token limits)
        const executiveLayer = await this.generateExecutiveLayer(definition, modelName);
        console.log(`[ISO] Executive layer generated`);

        const socIrLayer = await this.generateSOCIRLayer(definition, modelName);
        console.log(`[ISO] SOC/IR layer generated`);

        const otLayer = definition.targetOrganization.hasOT
            ? await this.generateOTLayer(definition, modelName)
            : this.generateEmptyOTLayer();
        console.log(`[ISO] OT layer generated`);

        const legalCommsLayer = await this.generateLegalCommsLayer(definition, modelName);
        console.log(`[ISO] Legal/Comms layer generated`);

        // Generate injects using all layer assets
        const allLayers = { executiveLayer, socIrLayer, otLayer, legalCommsLayer };
        const injects = await this.generateInjects(definition, allLayers, modelName);
        console.log(`[ISO] ${injects.length} injects generated`);

        // Generate branching logic
        const branchingLogic = await this.generateBranchingLogic(definition, injects, modelName);
        console.log(`[ISO] Branching logic generated`);

        // Generate scoring rubric
        const scoringRubric = await this.generateScoringRubric(definition, modelName);
        console.log(`[ISO] Scoring rubric generated`);

        // Collect all evidence from layers and injects
        const evidenceLibrary = this.collectEvidence(socIrLayer, injects);

        const compiled: CompiledScenario = {
            id: uuidv4(),
            scenarioDefinitionId: scenarioId,
            definition,
            compiledAt: new Date().toISOString(),
            modelUsed: modelName,
            executiveLayer,
            socIrLayer,
            otLayer,
            legalCommsLayer,
            injects,
            branchingLogic,
            scoringRubric,
            evidenceLibrary,
        };

        // Store compiled scenario
        isoService.storeCompiledScenario(scenarioId, compiled);

        console.log(`[ISO] Scenario compilation complete: ${compiled.id}`);
        return compiled;
    }

    /**
     * Generate Executive Layer Assets
     */
    async generateExecutiveLayer(definition: ScenarioDefinition, modelName: string): Promise<ExecutiveLayerAssets> {
        const provider = getProviderFromModel(modelName);

        const prompt = `You are an incident simulation scenario designer. Generate executive-level assets for an incident response exercise.

SCENARIO CONTEXT:
- Scenario Name: ${definition.name}
- Description: ${definition.description}
- Threat Actor: ${definition.threatActor.name} (${definition.threatActor.sophistication} sophistication)
- TTPs: ${definition.threatActor.ttps.join(', ')}
- Motivation: ${definition.threatActor.motivation}
- Target Organization: ${definition.targetOrganization.name} (${definition.targetOrganization.sector} sector, ${definition.targetOrganization.size})
- Domain: ${definition.targetOrganization.domain}
- Has OT Environment: ${definition.targetOrganization.hasOT}
- Regulatory Frameworks: ${definition.targetOrganization.regulatoryFrameworks.join(', ')}
- Severity Pattern: ${definition.severityCurve.pattern}, peak at ${definition.severityCurve.peakTimeMinutes} minutes
- Exercise Duration: ${definition.exerciseDurationMinutes} minutes

Generate the following JSON structure for EXECUTIVE LAYER assets:
{
  "initialBrief": "Markdown executive summary (2-3 paragraphs) briefing executives on the situation",
  "decisionCards": [
    {
      "id": "unique-id",
      "title": "Decision title",
      "situation": "Current situation summary",
      "riskLevel": "low|medium|high|critical",
      "confidenceIndicator": 75,
      "options": [
        {
          "id": "option-id",
          "label": "Option label",
          "description": "Detailed description",
          "consequence": "Hidden consequence revealed post-exercise",
          "impactAreas": ["Safety", "Compliance", "Continuity"],
          "scoreModifier": -5
        }
      ],
      "recommendedOptionId": "option-id or null",
      "timeConstraintMinutes": 15
    }
  ],
  "riskProjections": [
    {
      "id": "unique-id",
      "category": "Financial|Reputational|Regulatory|Safety|Operational",
      "currentRisk": 45,
      "projectedRisk": 75,
      "trend": "increasing|stable|decreasing",
      "timeframeHours": 24,
      "mitigationSuggestion": "Suggested action"
    }
  ],
  "boardSummaryTemplates": ["Template 1 markdown", "Template 2 markdown"],
  "keyMetrics": [
    {
      "id": "unique-id",
      "name": "Metric name",
      "value": "value or number",
      "unit": "optional unit",
      "status": "normal|warning|critical",
      "trend": "up|down|stable"
    }
  ]
}

Generate 3-4 decision cards, 4-5 risk projections, 2 board summary templates, and 5-6 key metrics that are realistic for this scenario.
Respond with ONLY the JSON, no explanations.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating executive layer:', error);
            throw new Error('Failed to generate executive layer assets');
        }
    }

    /**
     * Generate SOC/IR Layer Assets
     */
    async generateSOCIRLayer(definition: ScenarioDefinition, modelName: string): Promise<SOCIRLayerAssets> {
        const provider = getProviderFromModel(modelName);

        const prompt = `You are an incident simulation scenario designer. Generate SOC/Incident Response assets for an exercise.

SCENARIO CONTEXT:
- Threat Actor: ${definition.threatActor.name} (${definition.threatActor.sophistication})
- TTPs: ${definition.threatActor.ttps.join(', ')}
- Target: ${definition.targetOrganization.name} (${definition.targetOrganization.sector})
- Domain: ${definition.targetOrganization.domain}
- Severity: ${definition.severityCurve.pattern}, peak severity ${definition.severityCurve.peakSeverity}

Generate JSON for SOC/IR LAYER assets:
{
  "syntheticLogs": [
    {
      "id": "log-uuid",
      "type": "log",
      "title": "Log title",
      "summary": "Brief description",
      "content": "Full log content with realistic timestamps and details",
      "provenance": {
        "sourceSystem": "Windows Security",
        "collectionMethod": "SIEM",
        "chainOfCustody": ["Collected", "Verified"],
        "reliabilityScore": 95
      },
      "integrity": "verified",
      "visibleToRoles": ["SOC_IR", "Controller"],
      "requiresUnlock": false,
      "scenarioTimestamp": "2024-01-15T08:23:45Z",
      "source": "DC01.${definition.targetOrganization.domain}",
      "tags": ["authentication", "lateral-movement"],
      "criticalEvidence": true
    }
  ],
  "alertArtifacts": [
    {
      "id": "alert-uuid",
      "type": "alert",
      "title": "SIEM Alert Title",
      "summary": "Alert summary",
      "content": "Full alert details including detection logic",
      "provenance": { "sourceSystem": "SIEM", "collectionMethod": "Automated", "chainOfCustody": [], "reliabilityScore": 90 },
      "integrity": "verified",
      "visibleToRoles": ["SOC_IR", "Controller"],
      "requiresUnlock": false,
      "scenarioTimestamp": "timestamp",
      "source": "SIEM",
      "tags": ["detection"],
      "criticalEvidence": false
    }
  ],
  "visibilityGaps": [
    {
      "id": "gap-uuid",
      "description": "Description of monitoring gap",
      "affectedSystems": ["System1", "System2"],
      "blindSpotType": "logging|monitoring|detection|network",
      "mitigationSuggestion": "Suggested fix",
      "discoveryDifficulty": "easy|medium|hard"
    }
  ],
  "querySimulations": [
    {
      "id": "query-uuid",
      "purpose": "What this query helps discover",
      "queryType": "KQL|SPL|SQL|grep|PowerShell",
      "query": "Actual query syntax",
      "expectedResults": "What should be returned",
      "teachingPoint": "Learning objective"
    }
  ],
  "investigationCanvas": {
    "hypotheses": ["Hypothesis 1", "Hypothesis 2"],
    "initialQuestions": ["Question to investigate"],
    "evidenceChecklist": ["Item to check"],
    "escalationCriteria": ["When to escalate"]
  },
  "toolRecommendations": [
    {
      "id": "tool-uuid",
      "toolName": "Tool name",
      "purpose": "Why to use it",
      "useCase": "Specific use case in this scenario"
    }
  ]
}

Generate 4-5 synthetic logs (mix of Windows Security, Sysmon, firewall, authentication), 3-4 SIEM alerts, 2-3 visibility gaps, 3-4 query simulations, and 2-3 tool recommendations.
Make the content realistic with actual log formats and indicators.
Respond with ONLY the JSON.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating SOC/IR layer:', error);
            throw new Error('Failed to generate SOC/IR layer assets');
        }
    }

    /**
     * Generate OT Layer Assets
     */
    async generateOTLayer(definition: ScenarioDefinition, modelName: string): Promise<OTLayerAssets> {
        const provider = getProviderFromModel(modelName);

        const prompt = `You are an OT/ICS security expert. Generate OT layer assets for an incident simulation.

SCENARIO:
- Organization: ${definition.targetOrganization.name}
- Sector: ${definition.targetOrganization.sector}
- Threat Actor: ${definition.threatActor.name}
- TTPs: ${definition.threatActor.ttps.join(', ')}

Generate JSON for OT LAYER:
{
  "processModel": {
    "id": "uuid",
    "name": "Process name",
    "description": "Description",
    "processType": "Water treatment|Power generation|Manufacturing|etc",
    "components": [
      {
        "id": "comp-uuid",
        "name": "Component name",
        "type": "PLC|HMI|RTU|Sensor|Actuator|Historian|EWS|DCS",
        "status": "normal",
        "safetyState": "safe",
        "networkZone": "Level 0|Level 1|Level 2|DMZ",
        "vendor": "Vendor name",
        "firmwareVersion": "1.2.3"
      }
    ],
    "dataFlows": [
      {
        "id": "flow-uuid",
        "source": "comp-uuid",
        "destination": "comp-uuid",
        "protocol": "Modbus|DNP3|OPC UA|Ethernet/IP",
        "status": "normal",
        "criticality": "low|medium|high"
      }
    ],
    "criticalityLevel": "critical"
  },
  "safetyChains": [
    {
      "id": "uuid",
      "name": "Safety chain name",
      "description": "What it protects",
      "componentIds": ["comp-uuid"],
      "status": "intact",
      "bypassRisk": "Risk if bypassed",
      "safetyImpact": "Physical safety impact"
    }
  ],
  "operatorFriction": [
    {
      "id": "uuid",
      "description": "Scenario description",
      "manualOverrideRequired": true,
      "safetyImplication": "Safety consideration",
      "timeDelayMinutes": 15
    }
  ],
  "digitalTwinState": {
    "overallStatus": "normal|degraded|emergency",
    "activeAlarms": 0,
    "components": {},
    "lastUpdated": "timestamp"
  },
  "impactScenarios": [
    {
      "id": "uuid",
      "triggerAction": "What action triggers this",
      "effect": "Physical effect",
      "delayMinutes": 5,
      "cascadeEffects": ["Effect 1", "Effect 2"]
    }
  ]
}

Generate realistic OT assets with 4-6 components, appropriate data flows, 2 safety chains, 2-3 operator friction scenarios, and 2-3 impact scenarios.
Respond with ONLY the JSON.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating OT layer:', error);
            throw new Error('Failed to generate OT layer assets');
        }
    }

    /**
     * Generate empty OT layer for non-OT scenarios
     */
    private generateEmptyOTLayer(): OTLayerAssets {
        return {
            processModel: {
                id: uuidv4(),
                name: 'N/A - No OT Environment',
                description: 'This scenario does not involve OT systems',
                processType: 'None',
                components: [],
                dataFlows: [],
                criticalityLevel: 'low',
            },
            safetyChains: [],
            operatorFriction: [],
            digitalTwinState: {
                overallStatus: 'normal',
                activeAlarms: 0,
                components: {},
                lastUpdated: new Date().toISOString(),
            },
            impactScenarios: [],
        };
    }

    /**
     * Generate Legal/Comms Layer Assets
     */
    async generateLegalCommsLayer(definition: ScenarioDefinition, modelName: string): Promise<LegalCommsLayerAssets> {
        const provider = getProviderFromModel(modelName);

        const prompt = `You are a legal and communications expert. Generate legal/comms assets for an incident simulation.

SCENARIO:
- Organization: ${definition.targetOrganization.name}
- Sector: ${definition.targetOrganization.sector}
- Regulatory Frameworks: ${definition.targetOrganization.regulatoryFrameworks.join(', ')}
- Severity Pattern: ${definition.severityCurve.pattern}

Generate JSON for LEGAL/COMMS LAYER:
{
  "notificationClocks": [
    {
      "id": "uuid",
      "regulation": "GDPR|HIPAA|SEC|State law|etc",
      "description": "What triggers notification",
      "triggerCondition": "Specific condition",
      "deadlineHours": 72,
      "status": "not_triggered"
    }
  ],
  "regulatorThresholds": [
    {
      "id": "uuid",
      "regulator": "Regulator name",
      "thresholdDescription": "What threshold means",
      "currentExposure": "Current status",
      "reportingRequired": true,
      "penaltyRange": "$X - $Y"
    }
  ],
  "commsDrafts": [
    {
      "id": "uuid",
      "type": "internal|customer|media|regulator|board|partner",
      "audience": "Target audience",
      "subject": "Subject line",
      "template": "Markdown template with {{placeholders}}",
      "riskFlaggedPhrases": [
        {
          "phrase": "risky phrase",
          "risk": "why it's risky",
          "suggestion": "alternative",
          "severity": "warning|error"
        }
      ],
      "approvalRequired": true
    }
  ],
  "languageLintingRules": [
    {
      "id": "uuid",
      "pattern": "regex pattern",
      "severity": "warning|error",
      "message": "Warning message",
      "rationale": "Why this matters"
    }
  ],
  "stakeholderMap": [
    {
      "id": "uuid",
      "name": "Stakeholder name/role",
      "role": "Role description",
      "notificationPriority": "immediate|high|medium|low",
      "preferredChannel": "email|phone|in_person|secure_channel"
    }
  ]
}

Generate 3-4 notification clocks based on the regulatory frameworks, 2-3 regulator thresholds, 4-5 comms drafts (mix of internal, customer, media, regulator), 3-4 language linting rules, and 5-6 stakeholders.
Respond with ONLY the JSON.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating legal/comms layer:', error);
            throw new Error('Failed to generate legal/comms layer assets');
        }
    }

    /**
     * Generate Injects
     */
    async generateInjects(
        definition: ScenarioDefinition,
        layers: { executiveLayer: ExecutiveLayerAssets; socIrLayer: SOCIRLayerAssets; otLayer: OTLayerAssets; legalCommsLayer: LegalCommsLayerAssets },
        modelName: string
    ): Promise<Inject[]> {
        const provider = getProviderFromModel(modelName);

        const prompt = `You are an incident simulation designer. Generate timed injects for an exercise.

SCENARIO:
- Name: ${definition.name}
- Threat Actor: ${definition.threatActor.name}
- Duration: ${definition.exerciseDurationMinutes} minutes
- Target Inject Count: ${definition.targetInjectCount}
- Severity: starts at ${definition.severityCurve.startSeverity}, peaks at ${definition.severityCurve.peakSeverity} at T+${definition.severityCurve.peakTimeMinutes}

AVAILABLE EVIDENCE IDS (reference these in injects):
${layers.socIrLayer.syntheticLogs.map(l => `- ${l.id}: ${l.title}`).join('\n')}
${layers.socIrLayer.alertArtifacts.map(a => `- ${a.id}: ${a.title}`).join('\n')}

Generate JSON array of INJECTS:
[
  {
    "id": "inject-uuid",
    "sequenceNumber": 1,
    "scheduledTimeMinutes": 0,
    "status": "pending",
    "title": "Inject title",
    "description": "Overall description",
    "targetRoles": ["SOC_IR", "Executive"],
    "roleContent": {
      "SOC_IR": {
        "headline": "Technical headline",
        "body": "Detailed technical content in markdown",
        "attachments": ["evidence-id"],
        "urgency": "high",
        "actionRequired": true,
        "actionDescription": "What to do"
      },
      "Executive": {
        "headline": "Business headline",
        "body": "Business-focused content",
        "urgency": "medium",
        "actionRequired": false
      }
    },
    "evidenceIds": ["evidence-id-1", "evidence-id-2"],
    "expectedDecisions": [
      {
        "id": "decision-uuid",
        "prompt": "Decision prompt",
        "options": [
          {
            "id": "opt-uuid",
            "label": "Option label",
            "description": "Description",
            "consequence": "Hidden consequence",
            "impactAreas": ["Containment", "Recovery"],
            "scoreModifier": 5
          }
        ],
        "scoringWeight": 10,
        "targetRole": "SOC_IR"
      }
    ],
    "category": "technical|business|legal|safety|communications",
    "urgency": "low|medium|high|critical"
  }
]

Generate ${definition.targetInjectCount} injects spread across the exercise duration.
- First inject at T+0
- Space injects realistically (5-15 min apart early, can cluster during peak)
- Include a mix of technical, business, legal, and communications injects
- Reference actual evidence IDs from the available list
- Each inject should have role-specific content for relevant roles
Respond with ONLY the JSON array.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating injects:', error);
            throw new Error('Failed to generate injects');
        }
    }

    /**
     * Generate Branching Logic
     */
    async generateBranchingLogic(definition: ScenarioDefinition, injects: Inject[], modelName: string): Promise<BranchingRule[]> {
        const provider = getProviderFromModel(modelName);

        const injectSummary = injects.map(i => `- ${i.id}: ${i.title} (T+${i.scheduledTimeMinutes})`).join('\n');

        const prompt = `Generate branching rules for an incident simulation.

INJECTS:
${injectSummary}

Generate JSON array of BRANCHING RULES that create decision consequences:
[
  {
    "id": "rule-uuid",
    "name": "Rule name",
    "description": "What this rule does",
    "triggerType": "decision|time|evidence_access|cumulative_score",
    "condition": {
      "type": "decision",
      "triggerDecisionId": "decision-id",
      "triggerOptionId": "option-id"
    },
    "consequenceInjectIds": ["inject-id-to-trigger"],
    "skipInjectIds": ["inject-id-to-skip"]
  }
]

Generate 2-3 branching rules that create meaningful decision consequences.
Respond with ONLY the JSON array.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating branching logic:', error);
            // Return empty array if branching fails - it's not critical
            return [];
        }
    }

    /**
     * Generate Scoring Rubric
     */
    async generateScoringRubric(definition: ScenarioDefinition, modelName: string): Promise<ScoringRubric> {
        const provider = getProviderFromModel(modelName);

        const prompt = `Generate a scoring rubric for an incident response exercise.

SCENARIO:
- Name: ${definition.name}
- Sector: ${definition.targetOrganization.sector}
- Has OT: ${definition.targetOrganization.hasOT}
- Regulatory: ${definition.targetOrganization.regulatoryFrameworks.join(', ')}

Generate JSON for SCORING RUBRIC:
{
  "maxScore": 100,
  "categories": [
    {
      "id": "cat-uuid",
      "name": "Category name",
      "description": "What this measures",
      "weight": 25,
      "metrics": [
        {
          "id": "metric-uuid",
          "name": "Metric name",
          "description": "What is measured",
          "measurementType": "time|boolean|count|percentage|score",
          "targetValue": 30,
          "maxScore": 10,
          "penaltyPerUnit": 1
        }
      ]
    }
  ],
  "passingThreshold": 70
}

Include categories for:
- Detection & Analysis (time to detect, evidence utilization)
- Containment & Eradication (decision quality, speed)
- Communication (timeliness, accuracy)
- Regulatory Compliance (notification deadlines, documentation)
${definition.targetOrganization.hasOT ? '- OT Safety (safety chain protection, operator coordination)' : ''}

Each category should have 2-3 metrics. Weights should sum to 100.
Respond with ONLY the JSON.`;

        try {
            const response = await provider.generateContent(prompt);
            return this.cleanJsonResponse(response);
        } catch (error) {
            console.error('[ISO] Error generating scoring rubric:', error);
            throw new Error('Failed to generate scoring rubric');
        }
    }

    /**
     * Collect all evidence from layers into a single library
     */
    private collectEvidence(socIrLayer: SOCIRLayerAssets, injects: Inject[]): SyntheticEvidence[] {
        const evidence: SyntheticEvidence[] = [];

        // Add logs and alerts from SOC/IR layer
        evidence.push(...socIrLayer.syntheticLogs);
        evidence.push(...socIrLayer.alertArtifacts);

        // Deduplicate by ID
        const seen = new Set<string>();
        return evidence.filter(e => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
        });
    }
}

// Singleton instance
export const scenarioCompilerService = new ScenarioCompilerService();

// Export class for testing
export { ScenarioCompilerService };
