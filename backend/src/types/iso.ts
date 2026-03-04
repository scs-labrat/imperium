/**
 * Incident Simulation Orchestrator (ISO) Types
 *
 * Comprehensive type definitions for the incident simulation platform
 * including scenarios, exercises, injects, decisions, evidence, and scoring.
 */

// ============================================================
// CORE ENUMS
// ============================================================

export enum ISORole {
    CONTROLLER = "Controller",           // Exercise facilitator
    EXECUTIVE = "Executive",             // C-Suite / Board
    SOC_IR = "SOC_IR",                   // Security Operations / Incident Response
    OT_ENGINEER = "OT_Engineer",         // Operational Technology
    LEGAL_COMMS = "Legal_Comms",         // Legal and Communications
}

export enum ExerciseStatus {
    DRAFT = "draft",                     // Scenario defined but not compiled
    COMPILING = "compiling",             // LLM generating assets
    READY = "ready",                     // Compiled and ready to start
    RUNNING = "running",                 // Exercise in progress
    PAUSED = "paused",                   // Exercise paused
    COMPLETED = "completed",             // Exercise finished
}

export enum TimeMode {
    REAL_TIME = "realTime",              // 1:1 time progression
    ACCELERATED_2X = "accelerated2x",    // 2x speed
    ACCELERATED_5X = "accelerated5x",    // 5x speed
    ACCELERATED_10X = "accelerated10x",  // 10x speed
    MANUAL = "manual",                   // Manual time advancement
}

export enum InjectStatus {
    PENDING = "pending",                 // Not yet released
    RELEASED = "released",               // Released to participants
    ACKNOWLEDGED = "acknowledged",       // Participants have acknowledged
}

export enum EvidenceType {
    LOG = "log",                         // System/security logs
    ALERT = "alert",                     // SIEM/EDR alerts
    EMAIL = "email",                     // Email artifacts
    SCREENSHOT = "screenshot",           // Screenshot evidence
    NETWORK_CAPTURE = "network_capture", // PCAP summaries
    OT_READOUT = "ot_readout",          // OT system data
    THREAT_INTEL = "threat_intel",       // Threat intelligence
    DOCUMENT = "document",               // Documents/reports
}

export enum EvidenceIntegrity {
    VERIFIED = "verified",               // Confirmed authentic
    UNVERIFIED = "unverified",           // Not yet verified
    TAMPERED = "tampered",               // Evidence of tampering
    REDACTED = "redacted",               // Partially redacted
}

export enum DecisionOutcome {
    POSITIVE = "positive",               // Good outcome
    NEGATIVE = "negative",               // Bad outcome
    NEUTRAL = "neutral",                 // No significant impact
    PENDING = "pending",                 // Consequence not yet revealed
}

// ============================================================
// SCENARIO DEFINITION (Input)
// ============================================================

export interface ThreatActorProfile {
    name: string;
    sophistication: 'low' | 'medium' | 'high' | 'nation-state';
    ttps: string[];                      // MITRE ATT&CK technique IDs
    motivation: string;
    aliases?: string[];
    targetedSectors?: string[];
}

export interface TargetOrganization {
    name: string;
    sector: string;                      // Healthcare, Energy, Financial, etc.
    size: 'small' | 'medium' | 'large' | 'enterprise';
    domain: string;                      // e.g., "acme-corp.local"
    hasOT: boolean;                      // Has OT/ICS environment
    regulatoryFrameworks: string[];      // HIPAA, PCI-DSS, NERC CIP, etc.
    criticalAssets?: string[];
    geographicPresence?: string[];
}

export interface SeverityCurve {
    startSeverity: 1 | 2 | 3 | 4 | 5;
    peakSeverity: 1 | 2 | 3 | 4 | 5;
    pattern: 'slow_burn' | 'rapid_escalation' | 'wave' | 'persistent';
    peakTimeMinutes: number;             // When severity peaks
}

export interface ScenarioDefinition {
    id: string;
    name: string;
    description: string;
    threatActor: ThreatActorProfile;
    targetOrganization: TargetOrganization;
    severityCurve: SeverityCurve;
    exerciseDurationMinutes: number;
    targetInjectCount: number;
    customObjectives?: string[];
    createdAt: string;
    updatedAt?: string;
}

// ============================================================
// COMPILED SCENARIO ASSETS
// ============================================================

export interface CompiledScenario {
    id: string;
    scenarioDefinitionId: string;
    definition: ScenarioDefinition;
    compiledAt: string;
    modelUsed: string;

    // Layer-specific assets
    executiveLayer: ExecutiveLayerAssets;
    socIrLayer: SOCIRLayerAssets;
    otLayer: OTLayerAssets;
    legalCommsLayer: LegalCommsLayerAssets;

    // Timeline
    injects: Inject[];
    branchingLogic: BranchingRule[];

    // Scoring
    scoringRubric: ScoringRubric;

    // All evidence (referenced by ID in injects)
    evidenceLibrary: SyntheticEvidence[];
}

// ============================================================
// EXECUTIVE LAYER
// ============================================================

export interface ExecutiveLayerAssets {
    initialBrief: string;                // Markdown executive summary
    decisionCards: DecisionCard[];
    riskProjections: RiskProjection[];
    boardSummaryTemplates: string[];
    keyMetrics: ExecutiveMetric[];
}

export interface DecisionCard {
    id: string;
    title: string;
    situation: string;                   // Current situation summary
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceIndicator: number;         // 0-100
    options: DecisionOption[];
    recommendedOptionId?: string;
    timeConstraintMinutes?: number;
    linkedInjectId?: string;
}

export interface DecisionOption {
    id: string;
    label: string;
    description: string;
    consequence: string;                 // Revealed post-exercise
    impactAreas: string[];               // Safety, Compliance, Continuity, etc.
    scoreModifier: number;               // -10 to +10
    triggersInjectIds?: string[];
}

export interface RiskProjection {
    id: string;
    category: string;                    // Financial, Reputational, Regulatory, Safety
    currentRisk: number;                 // 0-100
    projectedRisk: number;               // 0-100
    trend: 'increasing' | 'stable' | 'decreasing';
    timeframeHours: number;
    mitigationSuggestion: string;
}

export interface ExecutiveMetric {
    id: string;
    name: string;
    value: string | number;
    unit?: string;
    status: 'normal' | 'warning' | 'critical';
    trend?: 'up' | 'down' | 'stable';
}

// ============================================================
// SOC / IR LAYER
// ============================================================

export interface SOCIRLayerAssets {
    syntheticLogs: SyntheticEvidence[];
    alertArtifacts: SyntheticEvidence[];
    visibilityGaps: VisibilityGap[];
    querySimulations: QuerySimulation[];
    investigationCanvas: InvestigationTemplate;
    toolRecommendations: ToolRecommendation[];
}

export interface VisibilityGap {
    id: string;
    description: string;
    affectedSystems: string[];
    blindSpotType: 'logging' | 'monitoring' | 'detection' | 'network';
    mitigationSuggestion: string;
    discoveryDifficulty: 'easy' | 'medium' | 'hard';
}

export interface QuerySimulation {
    id: string;
    purpose: string;
    queryType: 'KQL' | 'SPL' | 'SQL' | 'grep' | 'PowerShell';
    query: string;
    expectedResults: string;             // What the query should return
    teachingPoint: string;               // Learning objective
    linkedEvidenceIds?: string[];
}

export interface InvestigationTemplate {
    hypotheses: string[];
    initialQuestions: string[];
    evidenceChecklist: string[];
    escalationCriteria: string[];
}

export interface ToolRecommendation {
    id: string;
    toolName: string;
    purpose: string;
    useCase: string;
    scorePenaltyIfMissed?: number;
}

// ============================================================
// OT LAYER
// ============================================================

export interface OTLayerAssets {
    processModel: OTProcessModel;
    safetyChains: SafetyChain[];
    operatorFriction: OperatorFrictionScenario[];
    digitalTwinState: OTSystemState;
    impactScenarios: OTImpactScenario[];
}

export interface OTProcessModel {
    id: string;
    name: string;
    description: string;
    processType: string;                 // Water treatment, Power generation, etc.
    components: OTComponent[];
    dataFlows: OTDataFlow[];
    criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OTComponent {
    id: string;
    name: string;
    type: 'PLC' | 'HMI' | 'RTU' | 'Sensor' | 'Actuator' | 'Historian' | 'EWS' | 'DCS';
    status: 'normal' | 'degraded' | 'offline' | 'compromised';
    safetyState: 'safe' | 'warning' | 'danger';
    networkZone: string;
    vendor?: string;
    firmwareVersion?: string;
}

export interface OTDataFlow {
    id: string;
    source: string;                      // Component ID
    destination: string;                 // Component ID
    protocol: string;                    // Modbus, DNP3, OPC UA, etc.
    status: 'normal' | 'suspicious' | 'blocked' | 'compromised';
    criticality: 'low' | 'medium' | 'high';
}

export interface SafetyChain {
    id: string;
    name: string;
    description: string;
    componentIds: string[];
    status: 'intact' | 'degraded' | 'broken';
    bypassRisk: string;
    safetyImpact: string;
}

export interface OperatorFrictionScenario {
    id: string;
    description: string;
    manualOverrideRequired: boolean;
    automatedAlternative?: string;
    safetyImplication: string;
    timeDelayMinutes: number;
    linkedInjectId?: string;
}

export interface OTSystemState {
    overallStatus: 'normal' | 'degraded' | 'emergency';
    activeAlarms: number;
    components: Record<string, OTComponent>;
    lastUpdated: string;
}

export interface OTImpactScenario {
    id: string;
    triggerAction: string;
    effect: string;
    delayMinutes: number;
    cascadeEffects: string[];
}

// ============================================================
// LEGAL & COMMS LAYER
// ============================================================

export interface LegalCommsLayerAssets {
    notificationClocks: NotificationClock[];
    regulatorThresholds: RegulatorThreshold[];
    commsDrafts: CommsDraft[];
    languageLintingRules: LanguageLintingRule[];
    stakeholderMap: StakeholderEntry[];
}

export interface NotificationClock {
    id: string;
    regulation: string;                  // GDPR, HIPAA, SEC, etc.
    description: string;
    triggerCondition: string;
    deadlineHours: number;
    status: 'not_triggered' | 'triggered' | 'approaching' | 'overdue' | 'met';
    triggeredAt?: string;
    dueAt?: string;
}

export interface RegulatorThreshold {
    id: string;
    regulator: string;
    thresholdDescription: string;
    currentExposure: string;
    reportingRequired: boolean;
    penaltyRange?: string;
}

export interface CommsDraft {
    id: string;
    type: 'internal' | 'customer' | 'media' | 'regulator' | 'board' | 'partner';
    audience: string;
    subject: string;
    template: string;                    // Markdown with placeholders
    riskFlaggedPhrases: RiskFlaggedPhrase[];
    approvalRequired: boolean;
}

export interface RiskFlaggedPhrase {
    phrase: string;
    risk: string;
    suggestion: string;
    severity: 'warning' | 'error';
}

export interface LanguageLintingRule {
    id: string;
    pattern: string;                     // Regex pattern
    severity: 'warning' | 'error';
    message: string;
    rationale: string;
}

export interface StakeholderEntry {
    id: string;
    name: string;
    role: string;
    notificationPriority: 'immediate' | 'high' | 'medium' | 'low';
    preferredChannel: 'email' | 'phone' | 'in_person' | 'secure_channel';
}

// ============================================================
// INJECTS
// ============================================================

export interface Inject {
    id: string;
    sequenceNumber: number;
    scheduledTimeMinutes: number;        // Minutes from T+0
    actualReleaseTime?: string;          // ISO timestamp when actually released
    status: InjectStatus;

    title: string;
    description: string;

    // Role visibility (RBAC asymmetry)
    targetRoles: ISORole[];

    // Content per role
    roleContent: Partial<Record<ISORole, InjectRoleContent>>;

    // Evidence released with this inject
    evidenceIds: string[];

    // Expected decisions
    expectedDecisions: ExpectedDecision[];

    // Branching
    branchCondition?: BranchCondition;
    alternativeBranchInjectIds?: string[];

    // Metadata
    category: 'technical' | 'business' | 'legal' | 'safety' | 'communications';
    urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface InjectRoleContent {
    headline: string;
    body: string;                        // Markdown
    attachments?: string[];              // Evidence IDs
    urgency: 'low' | 'medium' | 'high' | 'critical';
    actionRequired?: boolean;
    actionDescription?: string;
}

export interface ExpectedDecision {
    id: string;
    prompt: string;
    options: DecisionOption[];
    timeLimitSeconds?: number;
    scoringWeight: number;
    targetRole: ISORole;
}

export interface BranchCondition {
    type: 'decision' | 'time' | 'evidence_access' | 'cumulative_score';
    triggerDecisionId?: string;
    triggerOptionId?: string;
    triggerTimeMinutes?: number;
    triggerEvidenceId?: string;
    triggerScoreThreshold?: number;
}

// ============================================================
// EVIDENCE & TELEMETRY
// ============================================================

export interface SyntheticEvidence {
    id: string;
    type: EvidenceType;
    title: string;
    summary: string;                     // Brief description
    content: string;                     // Full content (logs, email body, etc.)
    rawContent?: string;                 // Original "raw" format if different

    provenance: EvidenceProvenance;
    integrity: EvidenceIntegrity;

    // Access control (RBAC)
    visibleToRoles: ISORole[];
    requiresUnlock: boolean;             // Must investigate to access
    unlockCondition?: string;

    // Metadata
    scenarioTimestamp: string;           // In-scenario timestamp
    source: string;                      // System that generated it
    tags: string[];

    // Relationships
    relatedEvidenceIds?: string[];
    linkedInjectId?: string;

    // For scoring
    criticalEvidence: boolean;           // Missing this is a significant penalty
}

export interface EvidenceProvenance {
    sourceSystem: string;
    collectionMethod: string;
    chainOfCustody: string[];
    reliabilityScore: number;            // 0-100
}

// ============================================================
// BRANCHING LOGIC
// ============================================================

export interface BranchingRule {
    id: string;
    name: string;
    description: string;
    triggerType: 'decision' | 'time' | 'evidence_access' | 'cumulative_score';
    condition: BranchCondition;
    consequenceInjectIds: string[];
    skipInjectIds?: string[];
}

// ============================================================
// SCORING
// ============================================================

export interface ScoringRubric {
    maxScore: number;
    categories: ScoringCategory[];
    passingThreshold: number;            // Percentage
}

export interface ScoringCategory {
    id: string;
    name: string;
    description: string;
    weight: number;                      // Percentage of total score
    metrics: ScoringMetric[];
}

export interface ScoringMetric {
    id: string;
    name: string;
    description: string;
    measurementType: 'time' | 'boolean' | 'count' | 'percentage' | 'score';
    targetValue?: number;
    maxScore: number;
    penaltyPerUnit?: number;
}

export interface ExerciseScore {
    exerciseId: string;
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    passFail: 'pass' | 'fail';
    categoryScores: CategoryScore[];
    metricResults: MetricResult[];
    driftAnalytics: DriftAnalytics;
}

export interface CategoryScore {
    categoryId: string;
    categoryName: string;
    score: number;
    maxScore: number;
    percentage: number;
}

export interface MetricResult {
    metricId: string;
    metricName: string;
    measuredValue: number;
    targetValue?: number;
    score: number;
    maxScore: number;
    notes: string;
}

export interface DriftAnalytics {
    escalationDelaySeconds: number;
    averageDecisionTimeSeconds: number;
    evidenceNeglectRate: number;         // Percentage of critical evidence not accessed
    safetyBypasses: number;
    policyViolations: number;
    communicationGaps: number;
    missedDeadlines: number;
    roleCollaborationScore: number;      // 0-100
}

// ============================================================
// EXERCISE STATE (Runtime)
// ============================================================

export interface ExerciseState {
    id: string;
    scenarioId: string;
    compiledScenarioId: string;
    compiledScenario: CompiledScenario;
    status: ExerciseStatus;
    timeMode: TimeMode;

    // Timing
    startedAt?: string;
    pausedAt?: string;
    endedAt?: string;
    totalPausedDurationSeconds: number;
    elapsedTimeSeconds: number;          // Real or simulated elapsed time
    scenarioTimeMinutes: number;         // Current scenario time (T+X)

    // Current role (single-user MVP)
    currentRole: ISORole;
    currentUserName: string;

    // Released content tracking
    releasedInjectIds: string[];
    accessedEvidenceIds: string[];

    // Decisions made
    decisions: Decision[];

    // Notification clock states
    notificationClockStates: Record<string, NotificationClock>;

    // Live scoring (hidden during exercise)
    liveScoring: Partial<ExerciseScore>;

    // Future: Participants (multi-user)
    participants: Participant[];
}

export interface Decision {
    id: string;
    injectId: string;
    expectedDecisionId: string;
    selectedOptionId: string;
    madeBy: {
        role: ISORole;
        userName: string;
    };
    timestamp: string;
    scenarioTimeMinutes: number;
    evidenceConsideredIds: string[];     // Evidence viewed before decision
    evidenceIgnoredIds: string[];        // Critical evidence not viewed
    timeToDecisionSeconds: number;
    notes?: string;
    consequenceRevealed?: string;        // Filled in post-exercise
}

export interface Participant {
    id: string;
    name: string;
    role: ISORole;
    joinedAt: string;
    isActive: boolean;
    lastActivityAt: string;
}

// ============================================================
// EXPORT/IMPORT
// ============================================================

export interface ExerciseExport {
    version: string;                     // Schema version for compatibility
    exportedAt: string;
    exportedBy: string;

    // Core data
    scenarioDefinition: ScenarioDefinition;
    compiledScenario?: CompiledScenario;
    exerciseState?: ExerciseState;

    // Results
    postExerciseReport?: PostExerciseReport;
}

// ============================================================
// POST-EXERCISE REPORT
// ============================================================

export interface PostExerciseReport {
    exerciseId: string;
    exerciseName: string;
    generatedAt: string;

    // Summary
    executiveSummary: string;            // Markdown
    overallAssessment: 'excellent' | 'good' | 'needs_improvement' | 'failed';

    // Timeline
    timeline: TimelineEvent[];

    // Decision analysis
    decisionLog: DecisionLogEntry[];

    // Evidence analysis
    evidenceMap: EvidenceMapEntry[];

    // Scoring
    scoring: ExerciseScore;

    // Regulatory
    regulatoryExposure: RegulatoryExposure[];

    // Gaps and recommendations
    controlGaps: ControlGap[];
    recommendations: Recommendation[];

    // Suggested follow-up exercises
    suggestedReruns: SuggestedRerun[];
}

export interface TimelineEvent {
    timestamp: string;
    scenarioTimeMinutes: number;
    type: 'inject_released' | 'decision_made' | 'evidence_accessed' | 'role_switch' | 'status_change' | 'notification_triggered';
    description: string;
    actor?: string;
    details?: Record<string, any>;
}

export interface DecisionLogEntry {
    decision: Decision;
    injectTitle: string;
    optionChosen: string;
    consequence: string;
    impactAssessment: string;
    scoreImpact: number;
}

export interface EvidenceMapEntry {
    evidenceId: string;
    evidenceTitle: string;
    evidenceType: EvidenceType;
    accessedByRoles: ISORole[];
    accessedAt?: string;
    contributedToDecisionIds: string[];
    wasCritical: boolean;
    wasAccessed: boolean;
}

export interface RegulatoryExposure {
    regulation: string;
    status: 'compliant' | 'at_risk' | 'violation';
    details: string;
    recommendedAction: string;
}

export interface ControlGap {
    id: string;
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedAreas: string[];
    recommendation: string;
    relatedFrameworks?: string[];        // NIST CSF, ISO 27001, etc.
}

export interface Recommendation {
    id: string;
    priority: 'immediate' | 'short_term' | 'long_term';
    category: string;
    recommendation: string;
    rationale: string;
    estimatedEffort?: string;
}

export interface SuggestedRerun {
    id: string;
    scenario: string;
    focus: string;
    rationale: string;
    variations: string[];
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface CreateScenarioRequest {
    definition: Omit<ScenarioDefinition, 'id' | 'createdAt'>;
}

export interface CompileScenarioRequest {
    modelName: string;
}

export interface CreateExerciseRequest {
    scenarioId: string;
    userName: string;
}

export interface SwitchRoleRequest {
    role: ISORole;
}

export interface SetTimeModeRequest {
    timeMode: TimeMode;
}

export interface AdvanceTimeRequest {
    minutes: number;
}

export interface ReleaseInjectRequest {
    injectId: string;
}

export interface RecordDecisionRequest {
    injectId: string;
    expectedDecisionId: string;
    selectedOptionId: string;
    evidenceConsideredIds: string[];
    notes?: string;
}

export interface AccessEvidenceRequest {
    evidenceId: string;
}

export interface GenerateReportRequest {
    modelName: string;
}
