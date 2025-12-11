


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
}

export interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string; // Stored securely on backend, not sent from frontend
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
