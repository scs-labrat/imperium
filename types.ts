


export enum AttackType {
  PRIVILEGE_ESCALATION = "Privilege Escalation",
  LATERAL_MOVEMENT = "Lateral Movement",
  DATA_EXFILTRATION = "Data Exfiltration",
  INITIAL_ACCESS = "Initial Access",
  PERSISTENCE = "Persistence",
  DEFENSE_EVASION = "Defense Evasion",
  LOLBAS = "Living-Off-the-Land (LOLBAS)",
  MULTI_STAGE_PAYLOAD = "Multi-Stage Payload",
  CUSTOM_VULNERABILITY = "Custom Vulnerability Exploit",
  PACKER_LOADER = "Packer / Loader",
  DEFENSIVE_SCRIPT = "Defensive Script",
  INFRASTRUCTURE_AS_CODE = "Infrastructure as Code",
  GENERAL = "General",
}

export enum CodeLanguage {
  PYTHON = "Python",
  POWERSHELL = "PowerShell",
  BASH = "Bash",
  CSHARP = "C#",
  GO = "Go",
  RUST = "Rust",
  TERRAFORM = "Terraform",
  ANSIBLE = "Ansible",
  MIXED = "Mixed",
}

export enum TargetOS {
  WINDOWS = "Windows",
  LINUX = "Linux",
  MACOS = "macOS",
}

export interface TargetEnvironment {
  os: TargetOS;
  version: string;
  architecture: string;
}

export interface GenerationParams {
  objective: string;
  attackType: AttackType;
  language: CodeLanguage;
  target: TargetEnvironment;
}

export enum ObfuscationTechnique {
  STRING_ENCRYPTION = "String Encryption",
  API_HASHING = "API Hashing",
  JUNK_CODE = "Junk Code Insertion",
  POLYMORPHISM = "Polymorphic Code",
}

export interface VaultItem {
  id: string;
  name: string;
  params: GenerationParams;
  code: string;
  timestamp: string;
  team: 'RED' | 'BLUE';
}

export interface ShellcodeParams {
  lhost: string;
  lport: string;
  shellType: string;
  encoder: string;
  outputFormat: string;
}

export interface Redirector {
    id: string;
    name: string;
    ip: string;
    type: 'HTTP/S' | 'DNS' | 'TCP' | 'SMB';
    tier: 'Edge' | 'Internal';
    status: 'Healthy' | 'Degraded' | 'Down';
}

export interface Listener {
  id: string;
  name: string;
  type: 'HTTP' | 'HTTPS' | 'TCP' | 'SMB' | 'DNS' | 'mTLS' | 'QUIC' | 'Reverse TCP';
  host: string;
  port: number;
  status: 'active' | 'inactive';
  redirectorId?: string;
  jitterMin?: number;
  jitterMax?: number;
  hostHeader?: string;
}

export interface Agent {
  id: string;
  os: 'windows' | 'linux' | 'macos';
  osVersion: string;
  hostname: string;
  user: string;
  privileges: 'User' | 'Admin' | 'Root';
  ip: string;
  externalIp: string;
  lastSeen: string;
  firstSeen: string;
  status: 'active' | 'stale' | 'dead' | 'lost';
  listener: string;
  pid: number;
  processName: string;
  processInjectionTarget?: string;
}

export interface Loot {
  id:string;
  agentId: string;
  type: 'credential' | 'file' | 'screenshot' | 'keystrokes' | 'browser_artefacts' | 'network_data' | 'system_output';
  source: string;
  content: string;
  timestamp: string;
  confidence?: number;
  sourcePath?: string;
}

export enum UserRole {
    SUPER_ADMIN = "SuperAdmin",
    ADMIN = "Admin",
    USER = "User",
}

export enum LLMProvider {
    GOOGLE = "Google",
    ANTHROPIC = "Anthropic",
    CUSTOM = "Custom",
}

export interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    apiEndpoint?: string; // For custom LLM providers (OpenAI-compatible endpoint)
}

export type GranularLLMConfig = Partial<Record<AttackType, LLMConfig>>;

export interface ScriptEnginePermissions {
    enabled: boolean;
    allowedAttackTypes: AttackType[];
}

export interface Permissions {
    c2Access: boolean;
    reconAccess: boolean;
    attackPlanningAccess: boolean;
    agentBuilderAccess: boolean;
    scriptEngineAccess: ScriptEnginePermissions;
    userManagementAccess: boolean;
    settingsAccess: boolean;
}

export interface User {
    id: string;
    name: string;
    role: UserRole;
    platformLLMConfig: LLMConfig;
    granularLLMConfig: GranularLLMConfig;
    permissions: Permissions;
}

export interface EventLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export interface SiemConfig {
    url: string;
    apiKey: string; 
    connected: boolean;
}

export interface SiemRule {
    id: string;
    name: string;
    description: string;
    query: string;
    severity: string;
    risk_score: number;
    enabled: boolean;
}

// --- Offensive Infrastructure (IaC) Types ---

export enum C2Framework {
    IMPERIUM = "Imperium (This Platform)",
    MYTHIC = "Mythic",
    SLIVER = "Sliver",
    HAVOC = "Havoc",
    COBALT_STRIKE = "Cobalt Strike",
}

export enum CloudProvider {
    DO = "DigitalOcean",
    AWS = "AWS",
    AZURE = "Azure",
    GCP = "GCP",
    VULTR = "Vultr",
    HETZNER = "Hetzner",
}

export enum VmSize {
    SMALL = "Small",
    MEDIUM = "Medium",
    LARGE = "Large",
}

export enum OverlaySoftware {
    NEBULA = "Nebula",
    WIREGUARD = "WireGuard",
    ZEROTIER = "ZeroTier",
}

export enum ForwardingMethod {
    SOCAT = "socat",
    HAPROXY = "haproxy",
    NGINX = "nginx",
    RINETD = "rinetd",
}

export enum ReverseProxy {
    NGINX = "Nginx",
    CADDY = "Caddy",
    APACHE = "Apache",
}

export enum PayloadType {
    EXE = "EXE",
    DLL = "DLL",
    SHELLCODE = "Shellcode",
    POWERSHELL = "PowerShell",
    PYTHON = "Python",
    MACH_O = "Mach-O",
    ELF = "ELF",
    HTA = "HTA",
    VBA = "VBA",
    MSI = "MSI",
}

export interface McpConfig {
    command: string;
    args: string[];
    enabled: boolean;
}

// =========================================================================
// ISO (Incident Simulation Orchestrator) Types
// =========================================================================

export enum ISORole {
    CONTROLLER = "Controller",
    EXECUTIVE = "Executive",
    SOC_IR = "SOC_IR",
    OT_ENGINEER = "OT_Engineer",
    LEGAL_COMMS = "Legal_Comms",
}

export enum ExerciseStatus {
    DRAFT = "Draft",
    COMPILING = "Compiling",
    READY = "Ready",
    RUNNING = "Running",
    PAUSED = "Paused",
    COMPLETED = "Completed",
}

export enum TimeMode {
    REAL_TIME = "RealTime",
    ACCELERATED_2X = "Accelerated_2x",
    ACCELERATED_5X = "Accelerated_5x",
    ACCELERATED_10X = "Accelerated_10x",
    MANUAL = "Manual",
}

export enum InjectStatus {
    PENDING = "Pending",
    RELEASED = "Released",
    ACKNOWLEDGED = "Acknowledged",
}

export enum EvidenceType {
    LOG = "Log",
    ALERT = "Alert",
    EMAIL = "Email",
    SCREENSHOT = "Screenshot",
    OT_READOUT = "OT_Readout",
    THREAT_INTEL = "ThreatIntel",
    NETWORK_CAPTURE = "NetworkCapture",
    MEMORY_DUMP = "MemoryDump",
    FORENSIC_IMAGE = "ForensicImage",
}

export enum EvidenceIntegrity {
    VERIFIED = "verified",
    UNVERIFIED = "unverified",
    TAMPERED = "tampered",
}

export enum ThreatSophistication {
    SCRIPT_KIDDIE = "ScriptKiddie",
    CYBERCRIMINAL = "Cybercriminal",
    APT = "APT",
    NATION_STATE = "NationState",
}

export enum OrganizationSize {
    SMALL = "Small",
    MEDIUM = "Medium",
    LARGE = "Large",
    ENTERPRISE = "Enterprise",
}

export enum OTSector {
    ENERGY = "Energy",
    MANUFACTURING = "Manufacturing",
    WATER = "Water",
    TRANSPORTATION = "Transportation",
    HEALTHCARE = "Healthcare",
    CHEMICAL = "Chemical",
    NONE = "None",
}

// Threat Actor Profile
export interface ThreatActorProfile {
    name: string;
    sophistication: ThreatSophistication;
    ttps: string[];
    motivation: string;
    targetedSectors?: string[];
    knownTools?: string[];
}

// Target Organization
export interface TargetOrganization {
    name: string;
    sector: string;
    size: 'small' | 'medium' | 'large' | 'enterprise';
    domain: string;
    hasOT: boolean;
    otSector?: OTSector;
    regulatoryFrameworks: string[];
    geographicRegion?: string;
    criticalAssets?: string[];
}

// Severity Curve
export interface SeverityCurve {
    startSeverity: 1 | 2 | 3 | 4 | 5;
    peakSeverity: 1 | 2 | 3 | 4 | 5;
    pattern: 'slow_burn' | 'rapid_escalation' | 'wave' | 'persistent';
    peakTimeMinutes: number;
}

// Scenario Definition
export interface ISOScenarioDefinition {
    id: string;
    name: string;
    description: string;
    threatActor: ThreatActorProfile;
    targetOrganization: TargetOrganization;
    severityCurve: SeverityCurve;
    exerciseDurationMinutes: number;
    targetInjectCount: number;  // Renamed to match backend
    injectCount?: number;       // Alias for compatibility
    customObjectives?: string[];
    startTime?: string;
    createdAt: string;
    updatedAt?: string;
}

// Layer Assets
export interface DecisionCard {
    id: string;
    title: string;
    description: string;
    options: DecisionOption[];
    timeLimit?: number;
    consequences: Record<string, string>;
}

export interface DecisionOption {
    id: string;
    label: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskProjection {
    id: string;
    title: string;
    currentRisk: number;
    projectedRisk: number;
    factors: string[];
    financialImpact?: string;
}

export interface ExecutiveLayerAssets {
    initialBrief: string;
    decisionCards: DecisionCard[];
    riskProjections: RiskProjection[];
    stakeholderUpdates: string[];
}

export interface VisibilityGap {
    id: string;
    area: string;
    description: string;
    impact: string;
    mitigations: string[];
}

export interface QuerySimulation {
    id: string;
    query: string;
    expectedResults: string;
    actualResults: string;
    explanation: string;
}

export interface SOCIRLayerAssets {
    syntheticLogs: SyntheticEvidence[];
    alertArtifacts: SyntheticEvidence[];
    visibilityGaps: VisibilityGap[];
    querySimulations: QuerySimulation[];
    indicatorsOfCompromise: string[];
}

export interface OTProcessModel {
    id: string;
    name: string;
    diagram?: string;
    components: OTComponent[];
    normalState: string;
    compromisedState: string;
}

export interface OTComponent {
    id: string;
    name: string;
    type: string;
    criticality: 'low' | 'medium' | 'high' | 'critical';
    protocols: string[];
}

export interface SafetyChain {
    id: string;
    name: string;
    components: string[];
    bypassConditions: string[];
    consequences: string;
}

export interface OperatorFrictionScenario {
    id: string;
    scenario: string;
    operatorResponse: string;
    securityImplication: string;
}

export interface OTLayerAssets {
    processModel: OTProcessModel;
    safetyChains: SafetyChain[];
    operatorFriction: OperatorFrictionScenario[];
    affectedSystems: string[];
}

export interface NotificationClock {
    id: string;
    regulation: string;
    triggerCondition: string;
    deadlineHours: number;
    notificationTemplate: string;
    recipientTypes: string[];
}

export interface RegulatorThreshold {
    id: string;
    regulator: string;
    threshold: string;
    reportingRequirement: string;
    penalty?: string;
}

export interface CommsDraft {
    id: string;
    type: 'internal' | 'external' | 'regulatory' | 'media';
    audience: string;
    subject: string;
    body: string;
    approvalRequired: boolean;
}

export interface LegalCommsLayerAssets {
    notificationClocks: NotificationClock[];
    regulatorThresholds: RegulatorThreshold[];
    commsDrafts: CommsDraft[];
    legalConsiderations: string[];
}

// Inject Types
export interface InjectRoleContent {
    headline: string;
    body: string;
    attachments?: string[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
    actionRequired?: boolean;
    actionDescription?: string;
}

export interface DecisionOption2 {
    id: string;
    label: string;
    description: string;
    consequence: string;
    impactAreas: string[];
    scoreModifier: number;
    triggersInjectIds?: string[];
}

export interface ExpectedDecision {
    id: string;
    prompt: string;
    options: DecisionOption2[];
    timeLimitSeconds?: number;
    scoringWeight: number;
    targetRole: ISORole;
}

export interface ISOInject {
    id: string;
    sequenceNumber: number;
    scheduledMinutes: number;
    actualReleaseTime?: string;
    status: InjectStatus;
    title: string;
    description: string;
    targetRoles: ISORole[];
    roleContent: Partial<Record<ISORole, InjectRoleContent>>;
    evidenceIds: string[];
    expectedDecisions: ExpectedDecision[];
    category: 'technical' | 'business' | 'legal' | 'safety' | 'communications';
    urgency: 'low' | 'medium' | 'high' | 'critical';
}

// Branching Logic
export interface BranchingRule {
    id: string;
    sourceInjectId: string;
    condition: string;
    targetInjectId: string;
    skipInjectIds?: string[];
}

// Scoring
export interface ScoringCriterion {
    id: string;
    name: string;
    description: string;
    maxPoints: number;
    evaluationMethod: string;
}

export interface ScoringRubric {
    criteria: ScoringCriterion[];
    bonusConditions: Array<{ condition: string; points: number }>;
    penaltyConditions: Array<{ condition: string; points: number }>;
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

export interface DriftAnalyticsData {
    escalationDelaySeconds: number;
    averageDecisionTimeSeconds: number;
    evidenceNeglectRate: number;
    safetyBypasses: number;
    policyViolations: number;
    communicationGaps: number;
    missedDeadlines: number;
    roleCollaborationScore: number;
}

export interface ExerciseScore {
    exerciseId: string;
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    passFail: 'pass' | 'fail';
    categoryScores: CategoryScore[];
    metricResults: MetricResult[];
    driftAnalytics: DriftAnalyticsData;
}

// Compiled Scenario
export interface ISOCompiledScenario {
    id: string;
    definition: ISOScenarioDefinition;
    executiveLayer: ExecutiveLayerAssets;
    socIrLayer: SOCIRLayerAssets;
    otLayer?: OTLayerAssets;
    legalCommsLayer: LegalCommsLayerAssets;
    injects: ISOInject[];
    branchingRules: BranchingRule[];
    scoringRubric: ScoringRubric;
    compiledAt: string;
    modelUsed: string;
}

// Synthetic Evidence
export interface SyntheticEvidence {
    id: string;
    type: EvidenceType;
    title: string;
    content: string;
    visibleToRoles: ISORole[];
    timestamp: string;
    source: string;
    integrity: EvidenceIntegrity;
    metadata?: Record<string, unknown>;
}

// Decision Record
export interface ISODecision {
    id: string;
    injectId: string;
    selectedOptionId: string;
    madeBy: {
        role: ISORole;
        userName: string;
    };
    timestamp: string;
    evidenceConsidered: string[];
    evidenceIgnored: string[];
    timeToDecisionSeconds: number;
    rationale?: string;
}

// Exercise State
export interface ISOExerciseState {
    id: string;
    scenarioId: string;
    compiledScenarioId: string;
    compiledScenario: ISOCompiledScenario;
    status: ExerciseStatus;
    timeMode: TimeMode;
    currentRole: ISORole;
    currentUserName: string;
    elapsedMinutes: number;           // Alias for frontend compatibility (mapped from scenarioTimeMinutes)
    scenarioTimeMinutes: number;      // Backend canonical name
    elapsedTimeSeconds: number;
    totalPausedDurationSeconds: number;
    releasedInjectIds: string[];
    accessedEvidenceIds: string[];
    decisions: ISODecision[];
    notificationClockStates: Record<string, NotificationClock>;
    liveScoring: Partial<ExerciseScore>;
    participants: ISOParticipant[];
    startedAt?: string;
    pausedAt?: string;
    endedAt?: string;
}

// Participant in exercise
export interface ISOParticipant {
    id: string;
    name: string;
    role: ISORole;
    joinedAt: string;
    isActive: boolean;
    lastActivityAt: string;
}

// Post-Exercise Report
export interface DecisionAnalysisItem {
    injectId: string;
    injectTitle: string;
    decisionMade: string;
    optimalDecision: string;
    wasOptimal: boolean;
    timeToDecision: number;
    evidenceUtilized: number;
    evidenceAvailable: number;
    analysis: string;
}

export interface DriftAnalytics {
    proceduralDrift: Array<{ area: string; expected: string; actual: string; impact: string }>;
    communicationGaps: Array<{ timing: string; gap: string; consequence: string }>;
    decisionBiases: Array<{ bias: string; instances: string[]; recommendation: string }>;
}

export interface ISOPostExerciseReport {
    id: string;
    exerciseId: string;
    generatedAt: string;
    executiveSummary: string;
    exerciseMetrics: {
        totalDuration: number;
        injectsReleased: number;
        injectsAcknowledged: number;
        decisionsTotal: number;
        evidenceAccessed: number;
        evidenceAvailable: number;
    };
    decisionAnalysis: DecisionAnalysisItem[];
    rolePerformance: Partial<Record<ISORole, { score: number; strengths: string[]; improvements: string[] }>>;
    scoringBreakdown: Partial<ExerciseScore>;
    driftAnalytics: DriftAnalytics;
    recommendations: string[];
    lessonsLearned: string[];
}

// Export/Import
export interface ISOExerciseExport {
    version: string;
    exportedAt: string;
    scenarioDefinition: ISOScenarioDefinition;
    compiledScenario?: ISOCompiledScenario;
    exerciseState?: ISOExerciseState;
    postExerciseReport?: ISOPostExerciseReport;
}
