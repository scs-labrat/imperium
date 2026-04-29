
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
    reconAccess: boolean;
    attackPlanningAccess: boolean;
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
    verifyTls?: boolean;
    cloudId?: string;
    indexPattern?: string;
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


export type DetectIQOutput = {
    rule?: string;
    siemQuery?: string;
    explanation?: string;
    optimizedRule?: string;
};

export interface McpConfig {
    command: string;
    args: string[];
    enabled: boolean;
}

