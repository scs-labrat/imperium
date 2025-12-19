import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TargetIcon, CodeIcon, TerminalIcon, ActivityIcon, FileTextIcon, ShieldIcon, SparklesIcon, SaveIcon, BotIcon, SearchIcon, VaultIcon, UploadCloudIcon, WrenchIcon, TrashIcon, BracesIcon, LayoutDashboardIcon, FlaskConicalIcon, LineChartIcon, ChainIcon, PackageIcon, SkullIcon, ChevronDownIcon, ServerIcon, CpuIcon, DatabaseIcon, ClipboardListIcon, NetworkIcon, IntelIcon, UsersIcon, PlusIcon, XIcon, ImperiumLogo, FileDownIcon, KeyRoundIcon, BookTextIcon, ZapIcon, SettingsIcon, BrainCircuitIcon, FileSearchIcon, CrosshairIcon } from './components/icons';
import Loader from './components/Loader';
import VulnerabilityReport from './components/VulnerabilityReport';
import { generateCode, analyzeExecutionLog, obfuscateCode, performOsintAnalysis, analyzeVulnerabilityScan, parseNaturalLanguageCommand, analyzeSpiderfootJson, applyAnalysisRecommendations, generateExploitFromFinding, analyzeJavaScriptCode, simulateCodeExecution, performEvasionAnalysis, planMission, fetchVulnerabilityDetails, generateLoader, refineCode, chainPayloads, generateShellcode, performAdvancedOsintAnalysis, planDefenceMission, generateValidationPlan, generateDetectionRule, optimizeDetectionRule, explainDetectionRule, DetectIQOutput, generateIrPlan, generateIrTabletopScenario, convertKqlToDsl, analyzeSiemResponse, generateThreatHuntCode, analyzeThreatHuntLog } from './services/apiService';
import { c2Service } from './services/c2Service';
import { AttackType, CodeLanguage, TargetOS, GenerationParams, ObfuscationTechnique, VaultItem, ShellcodeParams, Listener, Agent, Loot, User, EventLog, UserRole, LLMProvider, Permissions, LLMConfig, SiemConfig, SiemRule, Redirector, C2Framework, CloudProvider, VmSize, OverlaySoftware, ForwardingMethod, ReverseProxy, PayloadType } from './types';
import { marked } from 'marked';


// --- Static Data ---
const OS_VERSIONS: Record<TargetOS, string[]> = {
    [TargetOS.WINDOWS]: ["Windows 11", "Windows 10", "Windows Server 2022", "Windows Server 2019", "Windows 7"],
    [TargetOS.LINUX]: ["Ubuntu 22.04", "Ubuntu 20.04", "Debian 11", "CentOS 9", "Kali Linux"],
    [TargetOS.MACOS]: ["macOS Sonoma (14)", "macOS Ventura (13)", "macOS Monterey (12)"],
};

const MONACO_LANGUAGE_MAP: Record<string, string> = {
    [CodeLanguage.PYTHON]: 'python',
    [CodeLanguage.POWERSHELL]: 'powershell',
    [CodeLanguage.BASH]: 'shell',
    [CodeLanguage.CSHARP]: 'csharp',
    [CodeLanguage.GO]: 'go',
    [CodeLanguage.RUST]: 'rust',
    [CodeLanguage.TERRAFORM]: 'terraform',
    [CodeLanguage.ANSIBLE]: 'yaml',
    [CodeLanguage.MIXED]: 'markdown',
    'c': 'c',
    'hex': 'plaintext',
    'raw': 'plaintext',
    'kql': 'kusto',
    'Sigma': 'yaml',
    'YARA': 'plaintext',
    'Snort': 'plaintext',
    'json': 'json',
    'shell': 'shell',
};

const SHELL_TYPES = [
    "windows/x64/meterpreter/reverse_tcp",
    "windows/meterpreter/reverse_tcp",
    "linux/x86_64/shell_reverse_tcp",
    "linux/x86/shell_reverse_tcp",
    "osx/x64/shell_reverse_tcp",
    "python/meterpreter/reverse_tcp",
    "php/meterpreter/reverse_tcp",
];

const ENCODERS = ["none", "x64/xor", "x86/shikata_ga_nai"];

const OUTPUT_FORMATS: { [key: string]: string } = {
    c: "C",
    python: "Python",
    powershell: "PowerShell",
    raw: "Raw Bytes",
    hex: "Hex",
    csharp: "C#",
};

const AVAILABLE_MODELS: Record<LLMProvider, string[]> = {
    [LLMProvider.GOOGLE]: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-latest"],
};

type View = 'DASHBOARD' | 'ATTACK_PLAN' | 'RECON' | 'WEAPONIZATION' | 'CHAINER' | 'SHELLCODE' | 'LISTENERS' | 'AGENTS' | 'LOOT' | 'REPORTING' | 'AGENT_BUILDER' | 'EVENT_LOG' | 'SETTINGS' | 'DEFEND' | 'OFFENSIVE_INFRA' | 'REDIRECTORS';
type ReconTab = 'OSINT' | 'SPIDERFOOT' | 'SCAN' | 'JS_ANALYSIS';
type WeaponizationTab = 'CODE' | 'LOG' | 'EVASION_ANALYSIS' | 'POST_EXEC_ANALYSIS';
type DefendTab = 'PLANNER' | 'SIEM' | 'VALIDATION' | 'DETECTIQ' | 'IR_ASSIST' | 'THREAT_HUNT' | 'IR_TABLETOP';
type SettingsTab = 'PROFILE' | 'LLM_CONFIG' | 'USER_MANAGEMENT' | 'PLATFORM' | 'MCP_CONFIG';

// --- Monaco Editor Component ---
declare const monaco: any;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFileDrop: (content: string, language: CodeLanguage) => void;
  language: string;
  readOnly?: boolean;
  editorRef?: React.MutableRefObject<any>;
  onSelectionChange?: (text: string, selection: any) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, onFileDrop, language, readOnly = false, editorRef, onSelectionChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const internalEditorRef = useRef<any>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    useEffect(() => {
        let editor: any;
        let observer: ResizeObserver;
    
        if (containerRef.current && typeof monaco !== 'undefined' && !internalEditorRef.current) {
            editor = monaco.editor.create(containerRef.current, {
                value,
                language,
                theme: 'vs-dark',
                automaticLayout: false, // Manually handle layout to prevent ResizeObserver loop error
                readOnly,
                minimap: { enabled: false },
                scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
                fontFamily: 'Fira Code, monospace',
                fontLigatures: true,
                wordWrap: 'on',
                padding: { top: 16 },
                renderLineHighlight: 'none',
                overviewRulerLanes: 0,
            });
            internalEditorRef.current = editor;
            if (editorRef) editorRef.current = editor;
    
            // Manually handle resizing to avoid loops
            observer = new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    internalEditorRef.current?.layout();
                });
            });
            observer.observe(containerRef.current);
    
            const contentDisposable = editor.onDidChangeModelContent(() => {
                const currentValue = editor.getValue();
                if (currentValue !== value) {
                    onChange(currentValue);
                }
            });
    
            let selectionDisposable: any;
            if (onSelectionChange) {
                selectionDisposable = editor.onDidChangeCursorSelection((e: any) => {
                    const selectedText = editor.getModel().getValueInRange(e.selection);
                    onSelectionChange(selectedText, e.selection);
                });
            }
    
            return () => {
                contentDisposable.dispose();
                if (selectionDisposable) selectionDisposable.dispose();
                observer.disconnect();
                if (editorRef) editorRef.current = null;
                if (internalEditorRef.current) {
                    internalEditorRef.current.dispose();
                    internalEditorRef.current = null;
                }
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef.current]);

    useEffect(() => {
        if (internalEditorRef.current && internalEditorRef.current.getValue() !== value) {
             internalEditorRef.current.setValue(value);
        }
    }, [value]);
    
    useEffect(() => {
        if (internalEditorRef.current && monaco) {
            monaco.editor.setModelLanguage(internalEditorRef.current.getModel(), language);
        }
    }, [language]);
    
    useEffect(() => {
      if (internalEditorRef.current) {
        internalEditorRef.current.updateOptions({ readOnly });
      }
    }, [readOnly]);
    
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const text = event.target?.result as string;
                if (text) {
                    const extension = file.name.split('.').pop()?.toLowerCase();
                    const langMap: { [key: string]: CodeLanguage } = {
                        'py': CodeLanguage.PYTHON, 'ps1': CodeLanguage.POWERSHELL, 'sh': CodeLanguage.BASH,
                        'cs': CodeLanguage.CSHARP, 'go': CodeLanguage.GO, 'rs': CodeLanguage.RUST,
                    };
                    onFileDrop(text, (extension && langMap[extension]) || CodeLanguage.PYTHON);
                }
            };
            
            reader.readAsText(file);
        }
    }, [onFileDrop]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDragEnter = () => setIsDraggingOver(true);
    const handleDragLeave = () => setIsDraggingOver(false);

    return (
        <div className="w-full h-full relative" onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}>
            {isDraggingOver && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 border-2 border-dashed border-primary">
                    <UploadCloudIcon className="w-16 h-16 text-primary" />
                    <p className="mt-4 text-xl text-primary font-semibold">Drop Code File to Import</p>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full bg-[#1e1e1e]" />
        </div>
    );
};


// --- UI Components ---
const baseInputStyles = "w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const baseSelectStyles = `${baseInputStyles} appearance-none`;
const primaryButtonStyles = "w-full flex items-center justify-center bg-primary text-primary-foreground font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-primary/50";
const secondaryButtonStyles = "flex items-center justify-center bg-transparent border border-border text-foreground font-semibold py-2 px-4 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
const dangerButtonStyles = "flex items-center justify-center bg-destructive text-destructive-foreground font-semibold py-2 px-4 rounded-md hover:bg-opacity-80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";


const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
    <div
        className="prose prose-sm prose-invert max-w-none prose-p:text-foreground prose-headings:text-primary prose-strong:text-accent-green prose-blockquote:border-primary prose-pre:bg-black/50 p-6"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
    />
);

type MissionStep = {
    action: string;
    attackType: AttackType;
    language: CodeLanguage;
    targetOS: TargetOS;
};

type DefenceMissionStep = {
    action: string;
    attackType: AttackType;
    language: string; 
    targetOS: string;
};

type ValidationPlan = {
    overview: string;
    phases: {
        title: string;
        steps: MissionStep[];
    }[];
};

type IrStep = {
    action: string;
    query: string;
};

type IrPhase = {
    title: string;
    steps: IrStep[];
};

type IrPlan = {
    phases: IrPhase[];
};


const parseMissionPlan = (markdown: string): MissionStep[] => {
    const steps: MissionStep[] = [];
    const stepRegex = /\*   \*\*Action:\*\* (.*?)\n\s*\*   \*\*Attack Type:\*\* (.*?)\n\s*\*   \*\*Language:\*\* (.*?)\n\s*\*   \*\*Target OS:\*\* (.*?)\n/g;
    let match;
    while ((match = stepRegex.exec(markdown)) !== null) {
        steps.push({
            action: match[1].trim(),
            attackType: match[2].trim() as AttackType,
            language: match[3].trim() as CodeLanguage,
            targetOS: match[4].trim() as TargetOS,
        });
    }
    return steps;
};

const parseDefencePlan = (markdown: string): DefenceMissionStep[] => {
    const steps: DefenceMissionStep[] = [];
    const stepRegex = /\*   \*\*Action:\*\* (.*?)\n\s*\*   \*\*Attack Type:\*\* (.*?)\n\s*\*   \*\*Language:\*\* (.*?)\n\s*\*   \*\*Target OS:\*\* (.*?)\n/g;
    let match;
    while ((match = stepRegex.exec(markdown)) !== null) {
        steps.push({
            action: match[1].trim(),
            attackType: match[2].trim() as AttackType,
            language: match[3].trim(),
            targetOS: match[4].trim(),
        });
    }
    return steps;
};

const parseValidationPlan = (markdown: string): ValidationPlan | null => {
    const overviewMatch = markdown.match(/^\*\*Overview:\*\*\s*(.*)/);
    if (!overviewMatch) return null;

    const plan: ValidationPlan = {
        overview: overviewMatch[1].trim(),
        phases: [],
    };

    const phaseRegex = /###\s*(.*?)\n([\s\S]*?)(?=\n###|$)/g;
    let phaseMatch;

    while ((phaseMatch = phaseRegex.exec(markdown)) !== null) {
        const title = phaseMatch[1].trim();
        const content = phaseMatch[2];
        const steps: MissionStep[] = [];

        const stepRegex = /\*   \*\*Action:\*\* (.*?)\n\s*\*   \*\*Attack Type:\*\* (.*?)\n\s*\*   \*\*Language:\*\* (.*?)\n\s*\*   \*\*Target OS:\*\* (.*?)\n/g;
        let stepMatch;
        while ((stepMatch = stepRegex.exec(content)) !== null) {
            steps.push({
                action: stepMatch[1].trim(),
                attackType: stepMatch[2].trim() as AttackType,
                language: stepMatch[3].trim() as CodeLanguage,
                targetOS: stepMatch[4].trim() as TargetOS,
            });
        }

        if (steps.length > 0) {
            plan.phases.push({ title, steps });
        }
    }

    return plan.phases.length > 0 ? plan : null;
};

const parseIrPlan = (markdown: string): IrPlan | null => {
    if (!markdown || markdown.trim() === '' || markdown.includes('Error')) return null;

    const plan: IrPlan = { phases: [] };
    const phaseRegex = /###\s*(.*?)\n([\s\S]*?)(?=\n###|$)/g;
    let phaseMatch;

    while ((phaseMatch = phaseRegex.exec(markdown)) !== null) {
        const title = phaseMatch[1].trim();
        const content = phaseMatch[2].trim();
        const steps: IrStep[] = [];

        const stepBlocks = content.split(/\n---\s*\n/);

        for (const stepBlock of stepBlocks) {
            const stepMatch = stepBlock.match(
                /\*\*Action:\*\*\s*(.*?)\n\s*\*\*KQL Query:\*\*\s*\`\`\`kql\n([\s\S]*?)\n\`\`\`/
            );

            if (stepMatch) {
                steps.push({
                    action: stepMatch[1].trim(),
                    query: stepMatch[2].trim(),
                });
            }
        }

        if (steps.length > 0) {
            plan.phases.push({ title, steps });
        }
    }

    return plan.phases.length > 0 ? plan : null;
};


// --- Mock Data ---
const ALL_ATTACK_TYPES = Object.values(AttackType);

const MOCK_USERS: User[] = [
    {
        id: 'user-super',
        name: 'Ghost',
        role: UserRole.SUPER_ADMIN,
        platformLLMConfig: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-pro' },
        granularLLMConfig: {},
        permissions: {
            c2Access: true,
            reconAccess: true,
            attackPlanningAccess: true,
            agentBuilderAccess: true,
            scriptEngineAccess: { enabled: true, allowedAttackTypes: ALL_ATTACK_TYPES },
            userManagementAccess: true,
            settingsAccess: true,
        }
    },
    {
        id: 'user-admin',
        name: 'Spectre',
        role: UserRole.ADMIN,
        platformLLMConfig: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-pro' },
        granularLLMConfig: {},
        permissions: {
            c2Access: true,
            reconAccess: true,
            attackPlanningAccess: true,
            agentBuilderAccess: true,
            scriptEngineAccess: { enabled: true, allowedAttackTypes: ALL_ATTACK_TYPES },
            userManagementAccess: true,
            settingsAccess: false,
        }
    },
    {
        id: 'user-basic',
        name: 'Shadow',
        role: UserRole.USER,
        platformLLMConfig: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-flash' },
        granularLLMConfig: {
            [AttackType.DATA_EXFILTRATION]: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-pro' }
        },
        permissions: {
            c2Access: false,
            reconAccess: true,
            attackPlanningAccess: false,
            agentBuilderAccess: false,
            scriptEngineAccess: { 
                enabled: true, 
                allowedAttackTypes: [
                    AttackType.INITIAL_ACCESS,
                    AttackType.LOLBAS,
                    AttackType.CUSTOM_VULNERABILITY,
                ]
            },
            userManagementAccess: false,
            settingsAccess: false,
        }
    },
];

interface AgentInteractionModalProps {
    agent: Agent;
    onClose: () => void;
    onTaskComplete: (loot: Loot) => void;
}

const AgentInteractionModal: React.FC<AgentInteractionModalProps> = ({ agent, onClose, onTaskComplete }) => {
    const [terminalHistory, setTerminalHistory] = useState<string[]>([`Welcome to the agent terminal for ${agent.hostname}.`]);
    const [terminalInput, setTerminalInput] = useState('');
    const [isTasking, setIsTasking] = useState(false);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalHistory]);
    
    const handleCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!terminalInput.trim()) return;

        const command = terminalInput;
        setTerminalHistory(prev => [...prev, `> ${command}`]);
        setTerminalInput('');

        const output = await c2Service.executeCommand(agent.id, command);
        setTerminalHistory(prev => [...prev, output]);
    };

    const handleRunTask = async (task: 'credential_harvesting' | 'network_scan' | 'system_enum' | 'privesc_check') => {
        setIsTasking(true);
        setTerminalHistory(prev => [...prev, `[+] Tasking agent to run ${task}...`]);
        try {
            const newLoot = await c2Service.runTask(agent.id, task);
            setTerminalHistory(prev => [...prev, `[+] Task completed. New loot collected: ${newLoot.type} - ${newLoot.source}`]);
            onTaskComplete(newLoot);
        } catch (error) {
            setTerminalHistory(prev => [...prev, `[-] Task failed: ${error instanceof Error ? error.message : String(error)}`]);
        } finally {
            setIsTasking(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
            <div className="bg-background border border-border rounded-lg w-full h-full max-w-6xl flex flex-col shadow-2xl shadow-primary/20">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-primary flex items-center gap-2"><CpuIcon/> Interact: {agent.hostname} ({agent.ip})</h2>
                    <button onClick={onClose} className="p-1 hover:bg-border rounded-md"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-border p-4 space-y-2 overflow-y-auto">
                        <h3 className="font-bold text-lg text-accent-orange">Agent Details</h3>
                        <p className="text-sm"><strong>User:</strong> {agent.user} <span className={`font-bold text-xs ml-2 ${agent.privileges === 'Root' || agent.privileges === 'Admin' ? 'text-destructive' : 'text-accent-green'}`}>({agent.privileges})</span></p>
                        <p className="text-sm"><strong>OS:</strong> {agent.osVersion}</p>
                        <p className="text-sm"><strong>Internal IP:</strong> {agent.ip}</p>
                        <p className="text-sm"><strong>External IP:</strong> {agent.externalIp}</p>
                        <p className="text-sm"><strong>PID:</strong> {agent.pid}</p>
                        <p className="text-sm"><strong>Process:</strong> {agent.processName}</p>
                        <p className="text-sm"><strong>Injected Into:</strong> {agent.processInjectionTarget || 'N/A'}</p>
                        
                        <h3 className="font-bold text-lg text-accent-orange pt-4 mt-4 border-t border-border">Built-in Modules</h3>
                        <div className="space-y-2">
                            <button onClick={() => handleRunTask('credential_harvesting')} disabled={isTasking} className={`${secondaryButtonStyles} w-full text-sm`}><KeyRoundIcon className="w-4 h-4 mr-2"/> Harvest Credentials (Mimikatz)</button>
                            <button onClick={() => handleRunTask('network_scan')} disabled={isTasking} className={`${secondaryButtonStyles} w-full text-sm`}><NetworkIcon className="w-4 h-4 mr-2"/> Enumerate Network</button>
                            <button onClick={() => handleRunTask('system_enum')} disabled={isTasking} className={`${secondaryButtonStyles} w-full text-sm`}><ServerIcon className="w-4 h-4 mr-2"/> Enumerate System Info</button>
                            <button onClick={() => handleRunTask('privesc_check')} disabled={isTasking} className={`${secondaryButtonStyles} w-full text-sm`}><ShieldIcon className="w-4 h-4 mr-2"/> Check Privesc Vectors</button>
                        </div>
                    </div>
                    <div className="w-2/3 flex flex-col">
                        <div ref={terminalEndRef} className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-black/30">
                            {terminalHistory.map((line, i) => <pre key={i}>{line}</pre>)}
                        </div>
                        <form onSubmit={handleCommand} className="p-2 border-t border-border flex gap-2">
                            <span className="font-mono text-primary">&gt;</span>
                            <input
                                type="text"
                                value={terminalInput}
                                onChange={e => setTerminalInput(e.target.value)}
                                className="flex-1 bg-transparent outline-none font-mono"
                                placeholder="Enter command..."
                                autoFocus
                            />
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [params, setParams] = useState<GenerationParams>({
        objective: 'Gain administrator privileges on the target system.',
        attackType: AttackType.PRIVILEGE_ESCALATION,
        language: CodeLanguage.PYTHON,
        target: {
            os: TargetOS.LINUX,
            version: 'Ubuntu 22.04',
            architecture: 'x86_64',
        },
    });
    const [vulnerabilityDetails, setVulnerabilityDetails] = useState('');
    const [obfuscationLevel, setObfuscationLevel] = useState(0);
    const [obfuscationTechniques, setObfuscationTechniques] = useState<ObfuscationTechnique[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [generatedCode, setGeneratedCode] = useState('// Your generated code will appear here...');
    const [executionLog, setExecutionLog] = useState('');
    const [evasionAnalysis, setEvasionAnalysis] = useState('');
    const [postExecAnalysis, setPostExecAnalysis] = useState('');
    const [reconReport, setReconReport] = useState('');
    
    const [activeView, setActiveView] = useState<View>('DASHBOARD');
    const [reconTab, setReconTab] = useState<ReconTab>('OSINT');
    const [weaponizationTab, setWeaponizationTab] = useState<WeaponizationTab>('CODE');
    const [defendTab, setDefendTab] = useState<DefendTab>('PLANNER');
    const [settingsTab, setSettingsTab] = useState<SettingsTab>('PROFILE');


    const [command, setCommand] = useState('');
    const [osintTarget, setOsintTarget] = useState('');
    const [useMcp, setUseMcp] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [jsCodeInput, setJsCodeInput] = useState('');
    const [vault, setVault] = useState<VaultItem[]>([]);
    const [isVaultOpen, setIsVaultOpen] = useState(false);
    const [spiderfootJsonContent, setSpiderfootJsonContent] = useState<string | null>(null);
    const [vulnIdentifier, setVulnIdentifier] = useState('');
    const [missionObjective, setMissionObjective] = useState('');
    const [missionPlan, setMissionPlan] = useState('');
    const [parsedPlan, setParsedPlan] = useState<MissionStep[]>([]);
    const [isEditorReady, setIsEditorReady] = useState(false);
    
    const [packerInput, setPackerInput] = useState('');
    const [payloadChain, setPayloadChain] = useState<VaultItem[]>([]);
    const [chainedCode, setChainedCode] = useState('// Your chained payload will appear here.');
    const [chainedPayloadName, setChainedPayloadName] = useState('');
    
    const [shellcodeParams, setShellcodeParams] = useState<ShellcodeParams>({
        lhost: '10.10.10.5',
        lport: '4444',
        shellType: SHELL_TYPES[0],
        encoder: ENCODERS[1],
        outputFormat: 'c',
    });
    const [generatedShellcode, setGeneratedShellcode] = useState('// Your generated shellcode will appear here...');

    // C2 State
    const [listeners, setListeners] = useState<Listener[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loot, setLoot] = useState<Loot[]>([]);
    const [redirectors, setRedirectors] = useState<Redirector[]>([]);
    const [agentBuildConfig, setAgentBuildConfig] = useState({
        os: TargetOS.WINDOWS,
        arch: 'x86_64',
        listenerId: '',
        payloadType: PayloadType.POWERSHELL,
        executionModel: 'stageless' as 'staged' | 'stageless',
        amsiBypass: true,
        etwBypass: false,
        persistence: false,
    });
    const [generatedAgentPayload, setGeneratedAgentPayload] = useState('// Your generated agent payload will appear here.');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    // Defend State
    const [siemConfig, setSiemConfig] = useState<SiemConfig>({ url: '', apiKey: '', connected: false });
    const [siemConfigInputs, setSiemConfigInputs] = useState({ url: '', apiKey: '' });
    
    // MCP State
    const [mcpConfig, setMcpConfig] = useState({ command: '', args: [] as string[], enabled: false });
    const [mcpConfigInputs, setMcpConfigInputs] = useState({ command: '', args: '' }); // args as string for input

    const [defenceObjective, setDefenceObjective] = useState('');

    // ... (existing code)

    useEffect(() => {
        if (settingsTab === 'MCP_CONFIG') {
            c2Service.getMcpConfig().then(config => {
                setMcpConfig(config);
                setMcpConfigInputs({
                    command: config.command,
                    args: config.args.join(' ')
                });
            }).catch(err => console.error("Failed to load MCP config", err));
        }
    }, [settingsTab]);

    const handleSaveMcpConfig = async () => {
        setIsLoading(true);
        try {
            const argsArray = mcpConfigInputs.args.split(' ').filter(a => a.trim() !== '');
            const newConfig = {
                command: mcpConfigInputs.command,
                args: argsArray,
                enabled: mcpConfig.enabled
            };
            await c2Service.saveMcpConfig(newConfig);
            setMcpConfig(newConfig);
            showToast('MCP Configuration saved.');
        } catch (error) {
            showToast('Failed to save MCP config.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    const [defencePlan, setDefencePlan] = useState('');
    const [parsedDefencePlan, setParsedDefencePlan] = useState<DefenceMissionStep[]>([]);
    const [validationObjective, setValidationObjective] = useState('');
    const [validationPlan, setValidationPlan] = useState('');
    const [parsedValidationPlan, setParsedValidationPlan] = useState<ValidationPlan | null>(null);
    const [siemTab, setSiemTab] = useState<'RULES' | 'QUERY' | 'SETTINGS'>('RULES');
    const [siemRules, setSiemRules] = useState<SiemRule[]>([]);
    const [siemQuery, setSiemQuery] = useState('process.name:powershell.exe');
    const [siemQueryResults, setSiemQueryResults] = useState<any[]>([]);

    
    // DetectIQ State
    type DetectIQTab = 'GENERATE' | 'OPTIMIZE' | 'EXPLAIN';
    const [detectiqActiveTab, setDetectiqActiveTab] = useState<DetectIQTab>('GENERATE');
    const [detectiqGenerateInput, setDetectiqGenerateInput] = useState({
        inputText: 'Suspicious PowerShell execution that uses WebClient to download a file',
        ruleType: 'Sigma' as 'Sigma' | 'YARA' | 'Snort',
        siemTarget: 'Splunk' as 'Splunk' | 'Elastic' | 'MicrosoftXDR' | '',
    });
    const [detectiqOptimizeInput, setDetectiqOptimizeInput] = useState('');
    const [detectiqExplainInput, setDetectiqExplainInput] = useState('');
    const [detectiqOutput, setDetectiqOutput] = useState<DetectIQOutput | null>(null);

    // IR Assist State
    const [irObjective, setIrObjective] = useState('');
    const [irPlan, setIrPlan] = useState('');
    const [parsedIrPlan, setParsedIrPlan] = useState<IrPlan | null>(null);

    // IR Tabletop State
    const [irTabletopObjective, setIrTabletopObjective] = useState('');
    const [irTabletopScenario, setIrTabletopScenario] = useState('');
    
    type SiemSubmitStep = 'IDLE' | 'COLLECT_VARS' | 'SHOW_CURL' | 'SHOW_RESPONSE' | 'SHOW_ANALYSIS';
    interface SiemSubmitState {
        isOpen: boolean;
        step: SiemSubmitStep;
        kqlQuery: string;
        placeholders: string[];
        variables: Record<string, string>;
        dslQuery: string;
        curlCommand: string;
        siemResponse: string;
        siemAnalysis: string;
    }

    const [siemSubmitState, setSiemSubmitState] = useState<SiemSubmitState>({
        isOpen: false,
        step: 'IDLE',
        kqlQuery: '',
        placeholders: [],
        variables: {},
        dslQuery: '',
        curlCommand: '',
        siemResponse: '',
        siemAnalysis: '',
    });

    // Threat Hunt State
    interface ThreatHuntParams {
      objective: string;
      language: CodeLanguage;
      target: { os: TargetOS; version: string; architecture: string; };
    }
    const [threatHuntParams, setThreatHuntParams] = useState<ThreatHuntParams>({
      objective: 'Find scheduled tasks that execute a base64 encoded command.',
      language: CodeLanguage.POWERSHELL,
      target: { os: TargetOS.WINDOWS, version: OS_VERSIONS[TargetOS.WINDOWS][0], architecture: 'x86_64' },
    });
    const [threatHuntCode, setThreatHuntCode] = useState('// Your generated threat hunting code will appear here...');
    const [threatHuntSimLog, setThreatHuntSimLog] = useState('');
    const [threatHuntVaultItemName, setThreatHuntVaultItemName] = useState(threatHuntParams.objective);
    useEffect(() => { setThreatHuntVaultItemName(threatHuntParams.objective); }, [threatHuntParams.objective]);
    
    interface ThreatHuntSuggestion {
        title: string;
        description: string;
    }
    interface ThreatHuntImprovementCategory {
        category: string;
        suggestions: ThreatHuntSuggestion[];
    }
    interface ThreatHuntAnalysisResult {
        analysisSummary: string;
        improvements: ThreatHuntImprovementCategory[];
    }

    const [parsedThreatHuntAnalysis, setParsedThreatHuntAnalysis] = useState<ThreatHuntAnalysisResult | null>(null);
    const [selectedThreatHuntImprovements, setSelectedThreatHuntImprovements] = useState<ThreatHuntSuggestion[]>([]);

    type ThreatHuntAnalysisTab = 'CODE' | 'LOG' | 'ANALYSIS';
    const [threatHuntAnalysisTab, setThreatHuntAnalysisTab] = useState<ThreatHuntAnalysisTab>('CODE');

    // Offensive Infrastructure State
    const [iacConfig, setIacConfig] = useState({
        iacTool: CodeLanguage.TERRAFORM,
        cloudProvider: CloudProvider.DO,
        c2Domain: 'hvck.hvckthehills.com',
        c2Framework: C2Framework.MYTHIC,
        c2VmSize: VmSize.MEDIUM,
        enableOverlay: true,
        overlaySoftware: OverlaySoftware.NEBULA,
        lighthouseVmSize: VmSize.SMALL,
        enableInternalHttp: true,
        internalHttpForwarder: ForwardingMethod.SOCAT,
        enableInternalDns: true,
        internalDnsForwarder: ForwardingMethod.SOCAT,
        enableEdgeHttp: true,
        edgeHttpProxy: ReverseProxy.NGINX,
        edgeHttpSsl: "Let's Encrypt",
        edgeHttpRedirectUrl: 'https://hvckthehills.com',
        enableEdgeDns: true,
    });

    // Platform State
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
    const [eventLog, setEventLog] = useState<EventLog[]>([]);
    const [lootFilter, setLootFilter] = useState({ agentId: '', type: '' });
    const [generatedReport, setGeneratedReport] = useState('');
    const [platformSettings, setPlatformSettings] = useState({
        defaultLLM: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-flash' },
        sessionTimeoutMinutes: 60,
        logRetentionDays: 90,
        disabledAttackTypes: [AttackType.DATA_EXFILTRATION as AttackType],
    });
    const [selectedUserForEditing, setSelectedUserForEditing] = useState<User | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);


    const editorRef = useRef<any>(null);
    const [refineSelection, setRefineSelection] = useState<any>(null);
    const [refinePrompt, setRefinePrompt] = useState('');
    
    const scriptEngineRef = useRef<HTMLDivElement>(null);
    const c2Ref = useRef<HTMLDivElement>(null);
    const intelRef = useRef<HTMLDivElement>(null);
    const platformRef = useRef<HTMLDivElement>(null);
    const defendRef = useRef<HTMLDivElement>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    
    const [toasts, setToasts] = useState<{id: number, message: string, type?: 'success' | 'error'}[]>([]);

    const [showSplash, setShowSplash] = useState(true);
    const [splashFading, setSplashFading] = useState(false);

    useEffect(() => {
      if (!showSplash) return;

      // After 15s, start fading
      const fadeTimer = setTimeout(() => {
        setSplashFading(true);
      }, 15000);

      // After 15s + 2s fade, remove splash
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 17000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }, [showSplash]);

    const logEvent = useCallback((action: string, details: string) => {
        const newEvent: EventLog = {
            id: new Date().toISOString() + Math.random(),
            timestamp: new Date().toISOString(),
            operator: currentUser.name,
            action,
            details,
        };
        setEventLog(prev => [newEvent, ...prev]);
    }, [currentUser.name]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const toggleDropdown = (name: string) => {
      setOpenDropdown(prev => prev === name ? null : name);
    };
    
    // --- Data Fetching from C2 Service ---
    const refreshListeners = useCallback(() => c2Service.getListeners().then(setListeners), []);
    const refreshAgents = useCallback(() => c2Service.getAgents().then(setAgents), []);
    const refreshLoot = useCallback(() => c2Service.getLoot().then(setLoot), []);
    const refreshRedirectors = useCallback(() => c2Service.getRedirectors().then(setRedirectors), []);
    const refreshSiemConfig = useCallback(() => {
        c2Service.getSiemConfig().then(config => {
            setSiemConfig(config);
            setSiemConfigInputs({ url: config.url, apiKey: config.apiKey });
        });
    }, []);
    const refreshSiemRules = useCallback(() => c2Service.getSiemRules().then(setSiemRules), []);

    useEffect(() => {
        refreshListeners();
        refreshAgents();
        refreshLoot();
        refreshRedirectors();
        refreshSiemConfig();

        // Socket.IO Event Listeners
        const handleNewAgent = (newAgent: Agent) => {
            setAgents(prev => [newAgent, ...prev]);
            showToast(`New agent connected: ${newAgent.hostname}`);
            logEvent('Agent Check-in', `New agent ${newAgent.hostname} connected.`);
        };

        const handleAgentStatusChange = (updatedAgent: Agent) => {
            setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        };

        const handleNewLoot = (newLoot: Loot) => {
            setLoot(prev => [newLoot, ...prev]);
            showToast(`New loot received from agent.`);
            logEvent('Loot Received', `Type: ${newLoot.type}`);
        };

        c2Service.on('new_agent', handleNewAgent);
        c2Service.on('agent_status_change', handleAgentStatusChange);
        c2Service.on('new_loot', handleNewLoot);

        const intervalId = setInterval(() => {
            refreshAgents();
        }, 30000); // Poll less frequently now that we have sockets (fallback)

        return () => {
            clearInterval(intervalId);
            c2Service.off('new_agent', handleNewAgent);
            c2Service.off('agent_status_change', handleAgentStatusChange);
            c2Service.off('new_loot', handleNewLoot);
        };
    }, [refreshAgents, refreshSiemConfig, refreshRedirectors, refreshLoot, refreshListeners, logEvent]);

    useEffect(() => {
        if (activeView === 'DEFEND' && defendTab === 'SIEM') {
            refreshSiemRules();
        }
    }, [activeView, defendTab, refreshSiemRules]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (scriptEngineRef.current && !scriptEngineRef.current.contains(event.target as Node) &&
                c2Ref.current && !c2Ref.current.contains(event.target as Node) &&
                intelRef.current && !intelRef.current.contains(event.target as Node) &&
                platformRef.current && !platformRef.current.contains(event.target as Node) &&
                defendRef.current && !defendRef.current.contains(event.target as Node)
            ) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const [vaultItemName, setVaultItemName] = useState(params.objective);
    useEffect(() => { setVaultItemName(params.objective); }, [params.objective]);

    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 50; 

        const initMonaco = () => {
            if (typeof (window as any).monaco !== 'undefined') {
                setIsEditorReady(true);
                return;
            }
            
            if (typeof (window as any).require === 'function') {
                (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
                (window as any).require(['vs/editor/editor.main'], () => {
                    setIsEditorReady(true);
                });
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(initMonaco, 100);
            } else {
                console.error("Failed to load Monaco Editor: Loader script did not initialize within 5 seconds.");
            }
        }
        initMonaco();
    }, []);

    const [isListenerModalOpen, setIsListenerModalOpen] = useState(false);
    const [newListener, setNewListener] = useState<Omit<Listener, 'id' | 'status'>>({ name: '', type: 'HTTP', host: '0.0.0.0', port: 80, redirectorId: '', jitterMin: 0, jitterMax: 5, hostHeader: '' });
    
    const [isRedirectorModalOpen, setIsRedirectorModalOpen] = useState(false);
    const [newRedirector, setNewRedirector] = useState<Omit<Redirector, 'id' | 'status'>>({ name: '', type: 'HTTP/S', ip: '', tier: 'Edge' });

    useEffect(() => {
      if (!agentBuildConfig.listenerId && listeners.length > 0) {
          setAgentBuildConfig(p => ({ ...p, listenerId: listeners[0].id }));
      }
    }, [listeners, agentBuildConfig.listenerId]);

    const handleCreateListener = async () => {
        await c2Service.createListener(newListener);
        logEvent('Listener Created', `Name: ${newListener.name}, Type: ${newListener.type}, Host: ${newListener.host}:${newListener.port}`);
        setIsListenerModalOpen(false);
        setNewListener({ name: '', type: 'HTTP', host: '0.0.0.0', port: 80 });
        refreshListeners();
    };
    
    const handleCreateRedirector = async () => {
        await c2Service.createRedirector(newRedirector);
        logEvent('Redirector Created', `Name: ${newRedirector.name}, IP: ${newRedirector.ip}`);
        setIsRedirectorModalOpen(false);
        setNewRedirector({ name: '', type: 'HTTP/S', ip: '', tier: 'Edge' });
        refreshRedirectors();
    };

    const getModelForTask = useCallback((attackType?: AttackType): string => {
        if (!currentUser) return 'gemini-2.5-pro'; // Fallback
        if (attackType && currentUser.granularLLMConfig[attackType]) {
            return currentUser.granularLLMConfig[attackType]!.model;
        }
        return currentUser.platformLLMConfig.model;
    }, [currentUser]);

    const handleGenerateAgentPayload = async () => {
        const selectedListener = listeners.find(l => l.id === agentBuildConfig.listenerId);
        if (!selectedListener) {
            showToast("Error: Please create and select a listener first.", 'error');
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage('Generating agent payload...');
        logEvent('Agent Generation Started', `Format: ${agentBuildConfig.payloadType}, Listener: ${selectedListener.name}`);
    
        const agentParams: GenerationParams = {
            objective: `Create a beaconing agent that connects back to ${selectedListener.host}:${selectedListener.port} for C2 communications. It should be stealthy and memory-resident if possible. Evasion: AMSI Bypass=${agentBuildConfig.amsiBypass}, ETW Bypass=${agentBuildConfig.etwBypass}. Execution: ${agentBuildConfig.executionModel}.`,
            attackType: AttackType.INITIAL_ACCESS,
            language: agentBuildConfig.payloadType as unknown as CodeLanguage, // Map this better if needed
            target: {
                os: agentBuildConfig.os as TargetOS,
                version: OS_VERSIONS[agentBuildConfig.os as TargetOS][0],
                architecture: agentBuildConfig.arch,
            },
        };
    
        try {
            const model = getModelForTask(agentParams.attackType);
            const code = await generateCode(agentParams, model);
            setGeneratedAgentPayload(code);
            showToast("Agent payload generated. Simulating check-in...");
            // Simulate agent check-in
            c2Service.simulateNewAgent(selectedListener.id, agentBuildConfig.os.toLowerCase() as Agent['os']).then(newAgent => {
                showToast(`New agent checked in: ${newAgent.hostname}`);
                refreshAgents();
                logEvent('Agent Check-in', `New agent ${newAgent.hostname} connected.`);
            });
        } catch (error) {
            console.error("Agent generation error:", error);
            setGeneratedAgentPayload(`// Agent generation failed.`);
            logEvent('Agent Generation Failed', error instanceof Error ? error.message : String(error));
            showToast("Agent generation failed.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- API Handlers ---
    const handleGenerateCode = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Generating exploit code...');
        setWeaponizationTab('CODE');
        try {
            logEvent('Code Generation Started', `Objective: ${params.objective}`);
            const model = getModelForTask(params.attackType);
            const code = await generateCode(params, model, vulnerabilityDetails);
            setGeneratedCode(code);
            setExecutionLog('');
            setEvasionAnalysis('');
            setPostExecAnalysis('');
            logEvent('Code Generation Succeeded', `Language: ${params.language}, Attack: ${params.attackType}`);
        } catch (error) {
            console.error("Failed to generate code:", error);
            setGeneratedCode(`// An error occurred: ${error instanceof Error ? error.message : String(error)}`);
             logEvent('Code Generation Failed', error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    }, [params, vulnerabilityDetails, logEvent, getModelForTask]);
    
    const handleParseCommand = useCallback(async () => {
        if (!command) return;
        setIsLoading(true);
        setLoadingMessage('Parsing command...');
        logEvent('Command Parsing Started', `Command: "${command}"`);
        try {
            const model = getModelForTask();
            const parsed = await parseNaturalLanguageCommand(command, model);
            if (parsed) {
                const newOS = parsed.target?.os || params.target.os;
                setParams(prev => ({
                    ...prev,
                    objective: parsed.objective || prev.objective,
                    attackType: parsed.attackType || prev.attackType,
                    language: parsed.language || prev.language,
                    target: {
                        os: newOS,
                        version: parsed.target?.version || OS_VERSIONS[newOS][0],
                        architecture: parsed.target?.architecture || prev.target.architecture,
                    }
                }));
                setObfuscationLevel(parsed.obfuscationLevel || 0);
                setObfuscationTechniques(parsed.obfuscationTechniques || []);
                logEvent('Command Parsing Succeeded', `Objective set to "${parsed.objective}"`);
            }
        } catch (error) {
            console.error("Failed to parse command:", error);
            logEvent('Command Parsing Failed', error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    }, [command, params.target.os, logEvent, getModelForTask]);

    const handleSimulateExecution = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Simulating execution...');
        setWeaponizationTab('LOG');
        logEvent('Execution Simulation Started', `Simulating code for ${params.language} on ${params.target.os}`);
        try {
            const model = getModelForTask(params.attackType);
            const result = await simulateCodeExecution(generatedCode, params, model);
            setExecutionLog(result);
        } catch (error) {
            console.error("Failed to simulate execution:", error);
            setExecutionLog(`// Simulation Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    }, [generatedCode, params, logEvent, getModelForTask]);

    const handleAnalyzeEvasion = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Analyzing evasion potential...');
        setWeaponizationTab('EVASION_ANALYSIS');
        logEvent('Evasion Analysis Started', `Analyzing ${params.language} code.`);
        try {
            const model = getModelForTask(params.attackType);
            const result = await performEvasionAnalysis(generatedCode, params.language, model);
            setEvasionAnalysis(result);
        } catch (error) {
            console.error("Failed to analyze evasion:", error);
            setEvasionAnalysis(`### Analysis Error\nCould not analyze code for evasion. Please check your API key and network connection.`);
        } finally {
            setIsLoading(false);
        }
    }, [generatedCode, params.language, logEvent, getModelForTask]);
    
    const handleAnalyzeLog = useCallback(async () => {
        if (!executionLog) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing execution log...');
        setWeaponizationTab('POST_EXEC_ANALYSIS');
        logEvent('Log Analysis Started', 'Analyzing simulation output.');
        try {
            const model = getModelForTask(params.attackType);
            const result = await analyzeExecutionLog(executionLog, generatedCode, params, model);
            setPostExecAnalysis(result);
        } catch (error) {
            console.error("Failed to analyze log:", error);
            setPostExecAnalysis(`### Analysis Error\nCould not analyze log. Please check your API key and network connection.`);
        } finally {
            setIsLoading(false);
        }
    }, [executionLog, generatedCode, params, logEvent, getModelForTask]);

    const handleApplyRecommendations = useCallback(async () => {
        if (!postExecAnalysis) return;
        setIsLoading(true);
        setLoadingMessage('Applying recommendations...');
        setWeaponizationTab('CODE');
        logEvent('Applying Recommendations', 'Refactoring code based on post-exec analysis.');
        try {
            const model = getModelForTask(params.attackType);
            const newCode = await applyAnalysisRecommendations(generatedCode, postExecAnalysis, params, model);
            setGeneratedCode(newCode);
        } catch (error) {
            console.error("Failed to apply recommendations:", error);
        } finally {
            setIsLoading(false);
        }
    }, [postExecAnalysis, generatedCode, params, logEvent, getModelForTask]);

    const handleSaveToVault = useCallback(() => {
        const name = vaultItemName.trim() || `Payload @ ${new Date().toLocaleTimeString()}`;
        const newItem: VaultItem = {
            id: new Date().toISOString(),
            name: name,
            params: JSON.parse(JSON.stringify(params)), // Deep copy
            code: generatedCode,
            timestamp: new Date().toISOString(),
            team: 'RED',
        };
        setVault(prev => [newItem, ...prev]);
        logEvent('Payload Saved', `Saved "${name}" to vault.`);
        showToast(`Saved "${name}" to vault.`);
        setIsVaultOpen(true);
    }, [vaultItemName, params, generatedCode, logEvent]);

    const handlePerformOsint = useCallback(async () => {
        if (!osintTarget) return;
        setIsLoading(true);
        const analysisType = useMcp ? 'Advanced OSINT' : 'OSINT';
        setLoadingMessage(useMcp ? 'Engaging MCP servers...' : 'Performing OSINT...');
        logEvent(`${analysisType} Started`, `Target: ${osintTarget}`);
        setReconReport('');
        try {
            const model = getModelForTask();
            const result = useMcp 
                ? await performAdvancedOsintAnalysis(osintTarget, model)
                : await performOsintAnalysis(osintTarget, model);
            setReconReport(result);
        } catch (error) {
            console.error("OSINT Error:", error);
            setReconReport(`### OSINT Error\nAn error occurred during analysis.`);
        } finally {
            setIsLoading(false);
        }
    }, [osintTarget, useMcp, logEvent, getModelForTask]);

    const handleAnalyzeScan = useCallback(async () => {
        if (!scanInput) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing scan results...');
        setReconReport('');
        logEvent('Scan Analysis Started', 'Parsing vulnerability scan results.');
        try {
            const model = getModelForTask();
            const result = await analyzeVulnerabilityScan(scanInput, model);
            setReconReport(result);
        } catch (error) {
            console.error("Scan Analysis Error:", error);
            setReconReport(`### Scan Analysis Error\nAn error occurred during analysis.`);
        } finally {
            setIsLoading(false);
        }
    }, [scanInput, logEvent, getModelForTask]);

    const handleAnalyzeSpiderfoot = useCallback(async () => {
        if (!spiderfootJsonContent) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing Spiderfoot data...');
        setReconReport('');
        logEvent('Spiderfoot Analysis Started', 'Parsing JSON data.');
        try {
            const model = getModelForTask();
            const result = await analyzeSpiderfootJson(spiderfootJsonContent, model);
            setReconReport(result);
        } catch (error) {
            console.error("Spiderfoot Analysis Error:", error);
            setReconReport(`### Spiderfoot Analysis Error\nAn error occurred during analysis.`);
        } finally {
            setIsLoading(false);
        }
    }, [spiderfootJsonContent, logEvent, getModelForTask]);

    const handleAnalyzeJs = useCallback(async () => {
        if (!jsCodeInput) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing JavaScript code...');
        setReconReport('');
        logEvent('JS Code Analysis Started', 'Searching for secrets and endpoints.');
        try {
            const model = getModelForTask();
            const result = await analyzeJavaScriptCode(jsCodeInput, model);
            setReconReport(result);
        } catch (error) {
            console.error("JS Analysis Error:", error);
            setReconReport(`### JS Analysis Error\nAn error occurred during analysis.`);
        } finally {
            setIsLoading(false);
        }
    }, [jsCodeInput, logEvent, getModelForTask]);

    const handleWeaponizeFromReport = (params: { objective: string; attackType: AttackType; language: CodeLanguage; targetOS: TargetOS }) => {
        setParams({
            objective: params.objective,
            attackType: params.attackType,
            language: params.language,
            target: {
                os: params.targetOS,
                version: OS_VERSIONS[params.targetOS][0],
                architecture: 'x86_64',
            }
        });
        setActiveView('WEAPONIZATION');
        showToast(`Loaded exploit details into Weaponization.`);
    };
    
     const handlePlanMission = useCallback(async () => {
        if (!missionObjective) return;
        setIsLoading(true);
        setLoadingMessage('Generating mission plan...');
        setMissionPlan('');
        setParsedPlan([]);
        logEvent('Mission Planning Started', `Objective: ${missionObjective}`);
        try {
            const model = getModelForTask();
            const result = await planMission(missionObjective, model);
            setMissionPlan(result);
            setParsedPlan(parseMissionPlan(result));
        } catch (error) {
            console.error("Mission Planning Error:", error);
            setMissionPlan(`### Mission Planning Error\nAn error occurred.`);
        } finally {
            setIsLoading(false);
        }
    }, [missionObjective, logEvent, getModelForTask]);

    const handleFetchVulnDetails = useCallback(async () => {
        if (!vulnIdentifier) return;
        setIsLoading(true);
        setLoadingMessage(`Fetching details for ${vulnIdentifier}...`);
        try {
            const model = getModelForTask();
            const details = await fetchVulnerabilityDetails(vulnIdentifier, model);
            setVulnerabilityDetails(details);
            setParams(p => ({...p, objective: details})); // Also set as objective
        } catch (error) {
            console.error("Error fetching vuln details:", error);
            showToast(`Failed to fetch details for ${vulnIdentifier}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [vulnIdentifier, getModelForTask]);

    const handleChainPayloads = useCallback(async () => {
        if (payloadChain.length < 2) return;
        setIsLoading(true);
        setLoadingMessage('Chaining payloads...');
        logEvent('Payload Chaining Started', `Chaining ${payloadChain.length} payloads into a single ${params.language} script.`);
        try {
            const model = getModelForTask();
            const result = await chainPayloads(payloadChain, params.language, params.target, model);
            setChainedCode(result);
        } catch (error) {
            console.error("Payload Chaining Error:", error);
            setChainedCode(`// Error chaining payloads: ${error}`);
        } finally {
            setIsLoading(false);
        }
    }, [payloadChain, params.language, params.target, logEvent, getModelForTask]);
    
    const handleGenerateShellcode = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Generating shellcode...');
        logEvent('Shellcode Generation Started', `Payload: ${shellcodeParams.shellType}, LHOST: ${shellcodeParams.lhost}`);
        try {
            const model = getModelForTask();
            const result = await generateShellcode(shellcodeParams, model);
            setGeneratedShellcode(result);
        } catch (error) {
            console.error("Shellcode Generation Error:", error);
            setGeneratedShellcode(`// Error generating shellcode.`);
        } finally {
            setIsLoading(false);
        }
    }, [shellcodeParams, logEvent, getModelForTask]);

    const handleFileDrop = (content: string, language: CodeLanguage) => {
        setGeneratedCode(content);
        setParams(p => ({ ...p, language }));
        setWeaponizationTab('CODE');
        setActiveView('WEAPONIZATION');
        logEvent('File Imported', `Imported ${language} file into editor.`);
    };

    const handleGenerateReport = () => {
        logEvent('Report Generated', 'Operation summary report created.');
        let report = `# Imperium C2 Operation Report\n\n**Generated on:** ${new Date().toLocaleString()}\n\n`;
    
        report += `## 1. Executive Summary\n\nThis report summarizes the activities conducted during the operation. A total of **${agents.length} agents** were deployed, **${loot.length} items** of loot were collected, and **${eventLog.length} operator actions** were logged.\n\n`;
    
        report += `## 2. Compromised Systems (Agents)\n\n`;
        report += `| Hostname | User | IP Address | OS | Status |\n`;
        report += `|---|---|---|---|---|\n`;
        agents.forEach(a => {
            report += `| ${a.hostname} | ${a.user} | ${a.ip} | ${a.osVersion} | ${a.status} |\n`;
        });
    
        report += `\n## 3. Collected Loot\n\n`;
        report += `| Type | Source | Agent | Timestamp |\n`;
        report += `|---|---|---|---|\n`;
        loot.forEach(l => {
            report += `| ${l.type} | ${l.source} | ${agents.find(a => a.id === l.agentId)?.hostname || l.agentId} | ${new Date(l.timestamp).toLocaleString()} |\n`;
        });
    
        report += `\n## 4. Operator Activity Log\n\n`;
        report += `| Timestamp | Operator | Action | Details |\n`;
        report += `|---|---|---|---|\n`;
        [...eventLog].reverse().forEach(e => {
            report += `| ${new Date(e.timestamp).toLocaleString()} | ${e.operator} | ${e.action} | ${e.details.substring(0, 100)} |\n`;
        });
        
        setGeneratedReport(report);
        showToast('Operation report generated successfully.');
    };

    // --- Defend Handlers ---
    const handlePlanDefenceMission = useCallback(async () => {
        if (!defenceObjective) return;
        setIsLoading(true);
        setLoadingMessage('Generating defence plan...');
        setDefencePlan('');
        setParsedDefencePlan([]);
        logEvent('Defence Planning Started', `Objective: ${defenceObjective}`);
        try {
            const model = getModelForTask();
            const result = await planDefenceMission(defenceObjective, model);
            setDefencePlan(result);
            setParsedDefencePlan(parseDefencePlan(result));
        } catch (error) {
            setDefencePlan(`### Defence Planning Error\nAn error occurred.`);
        } finally {
            setIsLoading(false);
        }
    }, [defenceObjective, getModelForTask, logEvent]);
    
    const handleWeaponizeDefenceStep = (step: DefenceMissionStep) => {
        const language = Object.values(CodeLanguage).find(l => l.toLowerCase() === step.language.toLowerCase()) as CodeLanguage | undefined 
            || CodeLanguage.BASH;
    
        const targetOS = Object.values(TargetOS).find(os => os.toLowerCase() === step.targetOS.toLowerCase()) as TargetOS | undefined
            || TargetOS.LINUX;
    
        setParams({
            objective: step.action,
            attackType: step.attackType,
            language: language,
            target: {
                os: targetOS,
                version: OS_VERSIONS[targetOS][0],
                architecture: 'x86_64',
            }
        });
        setActiveView('WEAPONIZATION');
        showToast(`Loaded step into Weaponization: "${step.action.substring(0, 30)}..."`);
    };

    const handleSaveSiemConfig = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Saving SIEM config...');
        try {
            await c2Service.saveSiemConfig({ ...siemConfigInputs, connected: siemConfig.connected });
            showToast('SIEM configuration saved.');
            refreshSiemConfig();
        } catch (error) {
            showToast('Failed to save SIEM configuration.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [siemConfigInputs, siemConfig.connected, refreshSiemConfig]);

    const handleTestSiemConnection = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Testing SIEM connection...');
        try {
            // FIX: Argument of type '{ url: string; apiKey: string; }' is not assignable to parameter of type 'SiemConfig'. Property 'connected' is missing. Add 'connected: false' to satisfy the type.
            const result = await c2Service.testSiemConnection({ ...siemConfigInputs, connected: false });
            if (result.success) {
                await c2Service.saveSiemConfig({ ...siemConfigInputs, connected: true });
                refreshSiemConfig();
                showToast(result.message);
            } else {
                 await c2Service.saveSiemConfig({ ...siemConfigInputs, connected: false });
                refreshSiemConfig();
                showToast(result.message, 'error');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            showToast(message, 'error');
            await c2Service.saveSiemConfig({ ...siemConfigInputs, connected: false });
            refreshSiemConfig();
        } finally {
            setIsLoading(false);
        }
    }, [siemConfigInputs, refreshSiemConfig]);
    
    const handleGenerateValidationPlan = useCallback(async () => {
        if (!validationObjective) return;
        setIsLoading(true);
        setLoadingMessage('Generating validation plan...');
        setValidationPlan('');
        setParsedValidationPlan(null);
        logEvent('Control Validation Plan Started', `Objective: ${validationObjective}`);
        try {
            const model = getModelForTask();
            const result = await generateValidationPlan(validationObjective, model);
            setValidationPlan(result);
            setParsedValidationPlan(parseValidationPlan(result));
        } catch (error) {
            console.error("Validation Plan Error:", error);
            setValidationPlan(`### Validation Plan Error\nAn error occurred.`);
        } finally {
            setIsLoading(false);
        }
    }, [validationObjective, logEvent, getModelForTask]);

    const handleWeaponizeValidationStep = (step: MissionStep) => {
        setParams({
            objective: step.action,
            attackType: step.attackType,
            language: step.language,
            target: {
                os: step.targetOS,
                version: OS_VERSIONS[step.targetOS][0],
                architecture: 'x86_64',
            }
        });
        setActiveView('WEAPONIZATION');
        showToast(`Loaded step into Weaponization: "${step.action.substring(0, 30)}..."`);
    };

    const handleSiemQuery = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!siemQuery) return;
        setIsLoading(true);
        setLoadingMessage('Querying SIEM...');
        setSiemQueryResults([]);
        try {
            const results = await c2Service.querySiem(siemQuery);
            setSiemQueryResults(results);
            if (results.length === 0) {
                showToast('Query returned no results.', 'success');
            }
        } catch (error) {
            showToast('Failed to query SIEM.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [siemQuery]);

    const handleToggleSiemRule = useCallback(async (ruleId: string) => {
        try {
            await c2Service.toggleSiemRule(ruleId);
            refreshSiemRules(); // refresh the list
            showToast('Rule status updated.');
        } catch (error) {
            showToast('Failed to update rule.', 'error');
        }
    }, [refreshSiemRules]);


    // --- DetectIQ Handlers ---
    const handleDetectIQAction = async (action: 'generate' | 'optimize' | 'explain') => {
        setIsLoading(true);
        setLoadingMessage(`Running DetectIQ ${action}...`);
        setDetectiqOutput(null);
        logEvent('DetectIQ Action', `Action: ${action}`);

        try {
            const model = getModelForTask();
            let result: DetectIQOutput = {};
            if (action === 'generate') {
                if (!detectiqGenerateInput.inputText) {
                    showToast('Please provide an input description.', 'error');
                    setIsLoading(false);
                    return;
                }
                result = await generateDetectionRule(
                    detectiqGenerateInput.inputText,
                    detectiqGenerateInput.ruleType,
                    model,
                    detectiqGenerateInput.siemTarget
                );
            } else if (action === 'optimize') {
                if (!detectiqOptimizeInput) {
                    showToast('Please provide a rule to optimize.', 'error');
                    setIsLoading(false);
                    return;
                }
                result = await optimizeDetectionRule(detectiqOptimizeInput, model);
            } else if (action === 'explain') {
                if (!detectiqExplainInput) {
                    showToast('Please provide a rule to explain.', 'error');
                    setIsLoading(false);
                    return;
                }
                result = await explainDetectionRule(detectiqExplainInput, model);
            }
            setDetectiqOutput(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            showToast(message, 'error');
            setDetectiqOutput({ explanation: `### Error\n${message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateIrPlan = useCallback(async () => {
        if (!irObjective) return;
        setIsLoading(true);
        setLoadingMessage('Generating IR plan...');
        setIrPlan('');
        setParsedIrPlan(null);
        logEvent('IR Plan Generation Started', `Objective: ${irObjective}`);
        try {
            const model = getModelForTask();
            const result = await generateIrPlan(irObjective, model);
            setIrPlan(result);
            setParsedIrPlan(parseIrPlan(result));
        } catch (error) {
            console.error("IR Plan Error:", error);
            setIrPlan(`### IR Plan Generation Error\nAn error occurred.`);
        } finally {
            setIsLoading(false);
        }
    }, [irObjective, logEvent, getModelForTask]);

    const handleGenerateIrTabletopScenario = useCallback(async () => {
        if (!irTabletopObjective) return;
        setIsLoading(true);
        setLoadingMessage('Generating IR tabletop scenario...');
        setIrTabletopScenario('');
        logEvent('IR Tabletop Scenario Generation Started', `Objective: ${irTabletopObjective}`);
        try {
            const model = getModelForTask();
            const result = await generateIrTabletopScenario(irTabletopObjective, model);
            setIrTabletopScenario(result);
        } catch (error) {
            console.error("IR Tabletop Scenario Error:", error);
            setIrTabletopScenario(`### IR Tabletop Scenario Generation Error\nAn error occurred.`);
        } finally {
            setIsLoading(false);
        }
    }, [irTabletopObjective, logEvent, getModelForTask]);
    
    // --- IR Assist SIEM Submit Handlers ---
    const handleInitiateSiemSubmit = (kqlQuery: string) => {
        const placeholderRegex = /<([A-Z_]+)>/g;
        const placeholders = [...new Set(Array.from(kqlQuery.matchAll(placeholderRegex), m => m[0]))];
        
        setSiemSubmitState({
            isOpen: true,
            step: 'COLLECT_VARS',
            kqlQuery,
            placeholders,
            variables: placeholders.reduce((acc, p) => ({ ...acc, [p]: '' }), {}),
            dslQuery: '',
            curlCommand: '',
            siemResponse: '',
            siemAnalysis: '',
        });
    };

    const handleGenerateCurl = async () => {
        setIsLoading(true);
        setLoadingMessage('Converting KQL to DSL...');
        try {
            const model = getModelForTask();
            const dslString = await convertKqlToDsl(siemSubmitState.kqlQuery, siemSubmitState.variables, model);
            const dslObject = JSON.parse(dslString);
            
            const url = siemConfig.connected ? siemConfig.url : siemSubmitState.variables['__ELASTIC_URL__'];
            const apiKey = siemConfig.connected ? siemConfig.apiKey : siemSubmitState.variables['__API_KEY__'];

            if (!url || !apiKey) {
                showToast("Elastic URL and API Key are required.", "error");
                return;
            }

            const curlCommand = `curl -X POST "${url}/_search" \\
-H "Authorization: ApiKey ${apiKey}" \\
-H "Content-Type: application/json" \\
-d '${JSON.stringify(dslObject, null, 2)}'`;

            setSiemSubmitState(prev => ({
                ...prev,
                step: 'SHOW_CURL',
                dslQuery: JSON.stringify(dslObject, null, 2),
                curlCommand,
            }));

        } catch(error) {
            showToast(error instanceof Error ? error.message : 'Failed to convert query.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitToSiem = async () => {
        setIsLoading(true);
        setLoadingMessage('Submitting query to SIEM...');
        try {
            const response = await c2Service.submitDslQuery(siemSubmitState.dslQuery);
            setSiemSubmitState(prev => ({
                ...prev,
                step: 'SHOW_RESPONSE',
                siemResponse: JSON.stringify(response, null, 2),
            }));
        } catch(error) {
            showToast(error instanceof Error ? error.message : 'Failed to submit query.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyzeSiemResponse = async () => {
        if (!siemSubmitState.siemResponse) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing response...');
        try {
            const model = getModelForTask();
            const analysis = await analyzeSiemResponse(siemSubmitState.siemResponse, model);
            setSiemSubmitState(prev => ({
                ...prev,
                step: 'SHOW_ANALYSIS',
                siemAnalysis: analysis,
            }));
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to analyze response.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCloseSiemModal = () => {
        setSiemSubmitState({
            isOpen: false,
            step: 'IDLE',
            kqlQuery: '',
            placeholders: [],
            variables: {},
            dslQuery: '',
            curlCommand: '',
            siemResponse: '',
            siemAnalysis: '',
        });
    };
    
    const handleCopyToClipboard = (text: string, subject: string = 'Text') => {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`${subject} copied to clipboard!`);
        }, (err) => {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy text.', 'error');
        });
    };

    // --- Threat Hunt Handlers ---
    const threatHuntGenerationParams = useMemo((): GenerationParams => ({
        objective: threatHuntParams.objective,
        attackType: AttackType.DEFENSIVE_SCRIPT,
        language: threatHuntParams.language,
        target: threatHuntParams.target,
    }), [threatHuntParams]);

    const handleGenerateThreatHuntCode = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Generating threat hunt code...');
        setThreatHuntAnalysisTab('CODE');
        try {
            logEvent('Threat Hunt Code Generation Started', `Objective: ${threatHuntParams.objective}`);
            const model = getModelForTask(AttackType.DEFENSIVE_SCRIPT);
            const code = await generateThreatHuntCode(threatHuntParams.objective, threatHuntParams.language, threatHuntParams.target, model);
            setThreatHuntCode(code);
            setThreatHuntSimLog('');
            setParsedThreatHuntAnalysis(null);
        } catch (error) {
            console.error("Failed to generate threat hunt code:", error);
            setThreatHuntCode(`// An error occurred: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    }, [threatHuntParams, logEvent, getModelForTask]);

    const handleSimulateThreatHuntCode = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Simulating threat hunt...');
        setThreatHuntAnalysisTab('LOG');
        logEvent('Threat Hunt Simulation Started', `Simulating ${threatHuntParams.language} on ${threatHuntParams.target.os}`);
        try {
            const model = getModelForTask(AttackType.DEFENSIVE_SCRIPT);
            const result = await simulateCodeExecution(threatHuntCode, threatHuntGenerationParams, model);
            setThreatHuntSimLog(result);
        } catch (error) {
            console.error("Failed to simulate execution:", error);
            setThreatHuntSimLog(`// Simulation Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    }, [threatHuntCode, threatHuntGenerationParams, threatHuntParams, logEvent, getModelForTask]);
    
    const handleAnalyzeThreatHuntLog = useCallback(async () => {
        if (!threatHuntSimLog) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing hunt log...');
        setThreatHuntAnalysisTab('ANALYSIS');
        logEvent('Threat Hunt Log Analysis Started', 'Analyzing simulation output.');
        try {
            const model = getModelForTask(AttackType.DEFENSIVE_SCRIPT);
            const result = await analyzeThreatHuntLog(threatHuntSimLog, threatHuntCode, threatHuntGenerationParams, model);
            setParsedThreatHuntAnalysis(result);
            setSelectedThreatHuntImprovements([]); // Reset selections on new analysis
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            showToast(message, 'error');
            setParsedThreatHuntAnalysis({ analysisSummary: `### Analysis Error\n${message}`, improvements: [] });
        } finally {
            setIsLoading(false);
        }
    }, [threatHuntSimLog, threatHuntCode, threatHuntGenerationParams, logEvent, getModelForTask]);

    const handleToggleThreatHuntImprovement = (suggestion: ThreatHuntSuggestion) => {
        setSelectedThreatHuntImprovements(prev => {
            const isSelected = prev.some(s => s.title === suggestion.title);
            if (isSelected) {
                return prev.filter(s => s.title !== suggestion.title);
            } else {
                return [...prev, suggestion];
            }
        });
    };

    const handleApplyThreatHuntRecommendations = useCallback(async () => {
        if (selectedThreatHuntImprovements.length === 0) {
            showToast("No recommendations selected to apply.", "error");
            return;
        };
        setIsLoading(true);
        setLoadingMessage('Applying recommendations...');
        setThreatHuntAnalysisTab('CODE');
        logEvent('Applying Threat Hunt Recommendations', `Applying ${selectedThreatHuntImprovements.length} improvements.`);

        const analysisString = `Please apply the following improvements to the script:\n\n` +
            selectedThreatHuntImprovements.map(s => `- **${s.title}:** ${s.description}`).join('\n');
        
        try {
            const model = getModelForTask(AttackType.DEFENSIVE_SCRIPT);
            const newCode = await applyAnalysisRecommendations(threatHuntCode, analysisString, threatHuntGenerationParams, model);
            setThreatHuntCode(newCode);
        } catch (error) {
            console.error("Failed to apply recommendations:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedThreatHuntImprovements, threatHuntCode, threatHuntGenerationParams, logEvent, getModelForTask]);

    const handleSaveThreatHuntToVault = useCallback(() => {
        const name = threatHuntVaultItemName.trim() || `Hunt Script @ ${new Date().toLocaleTimeString()}`;
        const newItem: VaultItem = {
            id: new Date().toISOString(),
            name: name,
            params: threatHuntGenerationParams,
            code: threatHuntCode,
            timestamp: new Date().toISOString(),
            team: 'BLUE',
        };
        setVault(prev => [newItem, ...prev]);
        logEvent('Threat Hunt Script Saved', `Saved "${name}" to vault.`);
        showToast(`Saved "${name}" to vault.`);
        setIsVaultOpen(true);
    }, [threatHuntVaultItemName, threatHuntGenerationParams, threatHuntCode, logEvent]);


    const handlePrepareIacPlan = useCallback(() => {
        let objective = `You are an expert in DevOps and offensive security infrastructure. Your task is to generate a complete Infrastructure as Code script in ${iacConfig.iacTool} for ${iacConfig.cloudProvider} based on the following detailed specification. The script must automate the deployment of a resilient, multi-layered C2 infrastructure.\n\n`;
        
        objective += `--- Overall Configuration ---\n`;
        objective += `- **C2 Domain:** ${iacConfig.c2Domain}\n\n`;

        if (iacConfig.c2Framework === C2Framework.IMPERIUM) {
            objective += `The C2 server is this Imperium platform. DO NOT generate resources for the C2 server itself. The infrastructure should be built to support it, with redirectors forwarding traffic to an endpoint managed by the user.\n\n`;
        } else {
            objective += `**C2 Server**\n- **C2 Framework:** ${iacConfig.c2Framework}\n- **VM Size:** ${iacConfig.c2VmSize}\n\n`;
        }

        if (iacConfig.enableOverlay) {
            objective += `**Secure Overlay Network (${iacConfig.overlaySoftware})**\n- A Lighthouse/coordination node should be deployed on a ${iacConfig.lighthouseVmSize} VM.\n- All subsequent nodes (C2, redirectors) must be part of this secure overlay network.\n\n`;
        }

        objective += `**Redirectors**\n`;
        if (iacConfig.enableEdgeHttp) {
            objective += `- **HTTP/S Edge Redirector:** Use ${iacConfig.edgeHttpProxy} to reverse proxy traffic. Obtain a ${iacConfig.edgeHttpSsl} certificate. Redirect non-C2 traffic to ${iacConfig.edgeHttpRedirectUrl}. Forward valid C2 traffic to the internal HTTP redirector.\n`;
        }
        if (iacConfig.enableInternalHttp) {
            objective += `- **Internal HTTP/S Redirector:** Use ${iacConfig.internalHttpForwarder} to forward traffic from the edge to the C2 server over the overlay network.\n`;
        }
        if (iacConfig.enableEdgeDns) {
            objective += `- **DNS Edge Redirector:** Forward incoming DNS requests to the internal DNS redirector.\n`;
        }
        if (iacConfig.enableInternalDns) {
            objective += `- **Internal DNS Redirector:** Use ${iacConfig.internalDnsForwarder} to forward DNS traffic to the C2 server over the overlay network.\n\n`;
        }

        objective += `Provide the complete, functional ${iacConfig.iacTool} code.`;

        setParams({
            objective: objective,
            attackType: AttackType.INFRASTRUCTURE_AS_CODE,
            language: iacConfig.iacTool,
            target: { os: TargetOS.LINUX, version: 'Ubuntu 22.04', architecture: 'x86_64' }
        });
        
        setActiveView('WEAPONIZATION');
        showToast('IaC plan sent to Weaponization workbench.');
        
    }, [iacConfig]);

    const filteredLoot = useMemo(() => {
        return loot
            .filter(l => !lootFilter.agentId || l.agentId === lootFilter.agentId)
            .filter(l => !lootFilter.type || l.type === lootFilter.type);
    }, [loot, lootFilter]);

    const ROLES_HIERARCHY: Record<UserRole, number> = {
        [UserRole.USER]: 1,
        [UserRole.ADMIN]: 2,
        [UserRole.SUPER_ADMIN]: 3,
    };

    const handleSaveUser = () => {
        if (selectedUserForEditing) {
            if (selectedUserForEditing.id === '') {
                // Create new user
                const newUser: User = {
                    ...selectedUserForEditing,
                    id: `user-${Date.now()}`,
                };
                setUsers(prev => [...prev, newUser]);
                showToast('User created successfully.');
            } else {
                // Update existing
                setUsers(prev => prev.map(u => u.id === selectedUserForEditing.id ? selectedUserForEditing : u));
                showToast('User updated successfully.');
            }
            setIsUserModalOpen(false);
            setSelectedUserForEditing(null);
        }
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User deleted.');
        }
    };

    const handleUpdateProfile = () => {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? currentUser : u));
        showToast('Profile updated successfully.');
    };
    
    const handleSavePlatformSettings = () => {
        showToast('Platform settings saved successfully.');
    };

    // --- Render ---
    if (!currentUser) {
        return <Loader message="Initializing Imperium..." />;
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background dot-bg text-foreground relative overflow-hidden">
            {/* Splash Screen */}
            {showSplash && (
              <div
                className={`
                  fixed inset-0 z-[9999] bg-[#0a0a0a]
                  flex flex-col items-center justify-end
                  transition-opacity duration-[1500ms] ease-out
                  ${splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                `}
              >
                <div className="relative flex flex-col items-center">
                  {/* Black glow instead of green */}
                  <div className="absolute inset-0 bg-black/80 blur-[120px] rounded-full"></div>

                  <img
                    src="https://base44.app/api/apps/691eec5b297464d9108f43db/files/public/691eec5b297464d9108f43db/0384e89a1_splash2.png"
                    alt="Imperium"
                    className="w-[100vw] max-w-[100%] h-auto relative drop-shadow-[0_0_25px_rgba(0,0,0,0.85)]"
                  />
                </div>
              </div>
            )}

            {isLoading && <Loader message={loadingMessage} />}
             {/* Toast Notifications */}
             <div className="absolute top-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`${toast.type === 'error' ? 'bg-destructive' : 'bg-green-500/90'} text-white font-bold py-2 px-4 rounded-md shadow-lg animate-toast-in-out`}>
                        {toast.message}
                    </div>
                ))}
            </div>
            {isListenerModalOpen && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-black/50 border border-border rounded-lg p-6 w-full max-w-lg shadow-2xl shadow-primary/20">
                        <h2 className="text-xl font-bold text-primary mb-4">Create New Listener</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Listener Name" value={newListener.name} onChange={e => setNewListener(p => ({...p, name: e.target.value}))} className={baseInputStyles} />
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-muted-foreground">PROTOCOL</label><div className="relative"><select value={newListener.type} onChange={e => setNewListener(p => ({...p, type: e.target.value as Listener['type']}))} className={baseSelectStyles}>{['HTTP', 'HTTPS', 'TCP', 'SMB', 'DNS', 'mTLS', 'QUIC', 'Reverse TCP'].map(t => <option key={t}>{t}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <div><label className="text-xs font-bold text-muted-foreground">BIND TO REDIRECTOR</label><div className="relative"><select value={newListener.redirectorId} onChange={e => setNewListener(p => ({...p, redirectorId: e.target.value}))} className={baseSelectStyles}><option value="">Direct C2 Bind</option>{redirectors.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip})</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-muted-foreground">BIND HOST</label><input type="text" placeholder="Host" value={newListener.host} onChange={e => setNewListener(p => ({...p, host: e.target.value}))} className={baseInputStyles} /></div>
                                <div><label className="text-xs font-bold text-muted-foreground">BIND PORT</label><input type="number" placeholder="Port" value={newListener.port} onChange={e => setNewListener(p => ({...p, port: Number(e.target.value)}))} className={baseInputStyles} /></div>
                            </div>
                             <div><label className="text-xs font-bold text-muted-foreground">HOST HEADER / DOMAIN FRONT</label><input type="text" placeholder="e.g., www.google.com" value={newListener.hostHeader} onChange={e => setNewListener(p => ({...p, hostHeader: e.target.value}))} className={baseInputStyles} /></div>
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => setIsListenerModalOpen(false)} className={secondaryButtonStyles}>Cancel</button>
                            <button onClick={handleCreateListener} className={primaryButtonStyles}>Create</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isRedirectorModalOpen && (
                 <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-black/50 border border-border rounded-lg p-6 w-full max-w-md shadow-2xl shadow-primary/20">
                        <h2 className="text-xl font-bold text-primary mb-4">Create New Redirector</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Redirector Name" value={newRedirector.name} onChange={e => setNewRedirector(p => ({...p, name: e.target.value}))} className={baseInputStyles} />
                            <div className="relative"><select value={newRedirector.type} onChange={e => setNewRedirector(p => ({...p, type: e.target.value as Redirector['type']}))} className={baseSelectStyles}><option>HTTP/S</option><option>DNS</option><option>TCP</option><option>SMB</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" /></div>
                            <div className="relative"><select value={newRedirector.tier} onChange={e => setNewRedirector(p => ({...p, tier: e.target.value as Redirector['tier']}))} className={baseSelectStyles}><option>Edge</option><option>Internal</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" /></div>
                            <input type="text" placeholder="IP Address" value={newRedirector.ip} onChange={e => setNewRedirector(p => ({...p, ip: e.target.value}))} className={baseInputStyles} />
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => setIsRedirectorModalOpen(false)} className={secondaryButtonStyles}>Cancel</button>
                            <button onClick={handleCreateRedirector} className={primaryButtonStyles}>Create</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isUserModalOpen && selectedUserForEditing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-black/50 border border-border rounded-lg p-6 w-full max-w-2xl shadow-2xl shadow-primary/20 flex flex-col max-h-[90vh]">
                        <h2 className="text-xl font-bold text-primary mb-4">{selectedUserForEditing.id ? 'Edit User' : 'Create User'}</h2>
                        <div className="space-y-4 overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-muted-foreground">NAME</label><input type="text" value={selectedUserForEditing.name} onChange={e => setSelectedUserForEditing(p => p ? ({...p, name: e.target.value}) : null)} className={baseInputStyles} /></div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground">ROLE</label>
                                    <div className="relative">
                                        <select value={selectedUserForEditing.role} onChange={e => setSelectedUserForEditing(p => p ? ({...p, role: e.target.value as UserRole}) : null)} className={baseSelectStyles}>
                                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border border-border rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-primary">Permissions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.c2Access} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, c2Access: e.target.checked}}) : null)} className="accent-primary"/> C2 Access</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.reconAccess} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, reconAccess: e.target.checked}}) : null)} className="accent-primary"/> Recon Access</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.attackPlanningAccess} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, attackPlanningAccess: e.target.checked}}) : null)} className="accent-primary"/> Attack Planning Access</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.agentBuilderAccess} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, agentBuilderAccess: e.target.checked}}) : null)} className="accent-primary"/> Agent Builder Access</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.userManagementAccess} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, userManagementAccess: e.target.checked}}) : null)} className="accent-primary"/> User Management</label>
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedUserForEditing.permissions.settingsAccess} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, settingsAccess: e.target.checked}}) : null)} className="accent-primary"/> Settings Access</label>
                                </div>
                                <div className="mt-2 pt-2 border-t border-border">
                                    <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={selectedUserForEditing.permissions.scriptEngineAccess.enabled} onChange={e => setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, scriptEngineAccess: {...p.permissions.scriptEngineAccess, enabled: e.target.checked}}}) : null)} className="accent-primary"/> Enable Script Engine</label>
                                    {selectedUserForEditing.permissions.scriptEngineAccess.enabled && (
                                        <div className="ml-6 text-xs grid grid-cols-2 gap-1">
                                            {Object.values(AttackType).map(at => (
                                                <label key={at} className="flex items-center gap-2">
                                                    <input 
                                                        type="checkbox" 
                                                        className="accent-primary"
                                                        checked={selectedUserForEditing.permissions.scriptEngineAccess.allowedAttackTypes.includes(at)}
                                                        onChange={e => {
                                                            if(e.target.checked) {
                                                                setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, scriptEngineAccess: {...p.permissions.scriptEngineAccess, allowedAttackTypes: [...p.permissions.scriptEngineAccess.allowedAttackTypes, at]}}}) : null)
                                                            } else {
                                                                setSelectedUserForEditing(p => p ? ({...p, permissions: {...p.permissions, scriptEngineAccess: {...p.permissions.scriptEngineAccess, allowedAttackTypes: p.permissions.scriptEngineAccess.allowedAttackTypes.filter(t => t !== at)}}}) : null)
                                                            }
                                                        }}
                                                    />
                                                    {at}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-4 pt-4 border-t border-border">
                            <button onClick={() => { setIsUserModalOpen(false); setSelectedUserForEditing(null); }} className={secondaryButtonStyles}>Cancel</button>
                            <button onClick={handleSaveUser} className={primaryButtonStyles}>Save User</button>
                        </div>
                    </div>
                </div>
            )}
            
            {selectedAgent && <AgentInteractionModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} onTaskComplete={(newLoot) => { refreshLoot(); showToast(`New loot collected!`); }} />}
            
            {siemSubmitState.isOpen && (
                 <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-background border border-border rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col shadow-2xl shadow-primary/20">
                         <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><ZapIcon/> Submit to Stack</h2>
                            <button onClick={handleCloseSiemModal} className="p-1 hover:bg-border rounded-md"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {siemSubmitState.step === 'COLLECT_VARS' && (
                                <form onSubmit={e => {e.preventDefault(); handleGenerateCurl();}} className="space-y-4">
                                    <h3 className="font-bold">Enter Query Variables</h3>
                                    {!siemConfig.connected && (
                                        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg space-y-3">
                                            <p className="text-sm font-bold text-destructive-foreground">SIEM not connected. Please provide connection details.</p>
                                             <div><label className="text-xs font-bold text-muted-foreground">ELASTIC URL</label><input required type="text" placeholder="https://my-elastic.example.com:9200" value={siemSubmitState.variables['__ELASTIC_URL__'] || ''} onChange={e => setSiemSubmitState(p => ({ ...p, variables: { ...p.variables, '__ELASTIC_URL__': e.target.value } }))} className={baseInputStyles} /></div>
                                             <div><label className="text-xs font-bold text-muted-foreground">API KEY</label><input required type="password" placeholder="Elastic API Key" value={siemSubmitState.variables['__API_KEY__'] || ''} onChange={e => setSiemSubmitState(p => ({ ...p, variables: { ...p.variables, '__API_KEY__': e.target.value } }))} className={baseInputStyles} /></div>
                                        </div>
                                    )}
                                    {siemSubmitState.placeholders.filter(p => !p.startsWith('__')).map(p => (
                                         <div key={p}><label className="text-xs font-bold text-muted-foreground">{p.replace(/[<>]/g, '')}</label><input required type="text" value={siemSubmitState.variables[p]} onChange={e => setSiemSubmitState(s => ({ ...s, variables: { ...s.variables, [p]: e.target.value } }))} className={baseInputStyles}/></div>
                                    ))}
                                    <button type="submit" className={`${primaryButtonStyles} mt-4`}>Generate cURL Command</button>
                                </form>
                            )}
                            {siemSubmitState.step === 'SHOW_CURL' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold">Generated cURL Request</h3>
                                    <p className="text-sm text-muted-foreground">Review the generated request. Click Submit to send it to the Elastic Stack.</p>
                                    <div className="h-64 overflow-hidden">{isEditorReady ? <CodeEditor value={siemSubmitState.curlCommand} onChange={() => {}} onFileDrop={() => {}} language="shell" readOnly /> : <Loader message="Loading..." />}</div>
                                    <div className="flex gap-4">
                                        <button onClick={handleCloseSiemModal} className={secondaryButtonStyles}>Cancel</button>
                                        <button onClick={handleSubmitToSiem} className={primaryButtonStyles}>Submit</button>
                                    </div>
                                </div>
                            )}
                             {(siemSubmitState.step === 'SHOW_RESPONSE' || siemSubmitState.step === 'SHOW_ANALYSIS') && (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="flex justify-between items-center">
                                         <h3 className="font-bold">SIEM Response</h3>
                                         <div className="flex gap-2">
                                            <button onClick={() => handleCopyToClipboard(siemSubmitState.siemResponse, 'Response')} className={`${secondaryButtonStyles} text-xs px-3`}>Copy JSON</button>
                                            <button onClick={handleAnalyzeSiemResponse} className={`${secondaryButtonStyles} text-xs px-3`}>Analyse</button>
                                            <button onClick={handleCloseSiemModal} className={`${dangerButtonStyles} text-xs px-3`}>Close</button>
                                         </div>
                                    </div>
                                    {siemSubmitState.step === 'SHOW_ANALYSIS' && siemSubmitState.siemAnalysis && (
                                        <div className="h-1/3 overflow-y-auto border border-border rounded-lg bg-input/50"><MarkdownRenderer content={siemSubmitState.siemAnalysis} /></div>
                                    )}
                                    <div className="flex-1 overflow-hidden">{isEditorReady ? <CodeEditor value={siemSubmitState.siemResponse} onChange={() => {}} onFileDrop={() => {}} language="json" readOnly /> : <Loader message="Loading..." />}</div>
                                </div>
                             )}
                        </div>
                    </div>
                 </div>
            )}

            <header className="bg-black/30 border-b border-border flex items-center p-2 px-4 gap-6 flex-shrink-0">
                 <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('DASHBOARD')}>
                    <ImperiumLogo className="h-8 w-auto" />
                 </div>
                 <nav className="flex items-center gap-2">
                    {(currentUser.permissions.attackPlanningAccess || currentUser.permissions.reconAccess) && (
                        <div ref={intelRef} className="relative">
                            <button onClick={() => toggleDropdown('Intel & Recon')} className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md hover:bg-border transition-colors ${openDropdown === 'Intel & Recon' ? 'bg-border' : ''}`}>
                                <IntelIcon className="w-5 h-5 text-primary"/> Intel & Recon
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'Intel & Recon' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'Intel & Recon' && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg p-2 z-50 shadow-lg shadow-primary/20 space-y-1">
                                {currentUser.permissions.attackPlanningAccess && <button onClick={() => {setActiveView('ATTACK_PLAN'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'ATTACK_PLAN' ? 'bg-primary/20 text-primary' : ''}`}><LayoutDashboardIcon className="w-4 h-4" /> Mission Planning</button>}
                                {currentUser.permissions.reconAccess && <button onClick={() => {setActiveView('RECON'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'RECON' ? 'bg-primary/20 text-primary' : ''}`}><SearchIcon className="w-4 h-4" /> Reconnaissance</button>}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {currentUser.permissions.scriptEngineAccess.enabled && (
                        <div ref={scriptEngineRef} className="relative">
                            <button onClick={() => toggleDropdown('Script Engine')} className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md hover:bg-border transition-colors ${openDropdown === 'Script Engine' ? 'bg-border' : ''}`}>
                                <WrenchIcon className="w-5 h-5 text-accent-green"/> Script Engine
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'Script Engine' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'Script Engine' && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg p-2 z-50 shadow-lg shadow-green-500/10 space-y-1">
                                    <button onClick={() => {setActiveView('WEAPONIZATION'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'WEAPONIZATION' ? 'bg-primary/20 text-primary' : ''}`}><SkullIcon className="w-4 h-4" /> Weaponization</button>
                                    <button onClick={() => {setActiveView('CHAINER'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'CHAINER' ? 'bg-primary/20 text-primary' : ''}`}><ChainIcon className="w-4 h-4" /> Payload Chainer</button>
                                    <button onClick={() => {setActiveView('SHELLCODE'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'SHELLCODE' ? 'bg-primary/20 text-primary' : ''}`}><BracesIcon className="w-4 h-4" /> Shellcode Gen</button>
                                    <button onClick={() => {setIsVaultOpen(true); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent`}><VaultIcon className="w-4 h-4" /> Payload Vault</button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div ref={defendRef} className="relative">
                        <button onClick={() => toggleDropdown('Defend')} className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md hover:bg-border transition-colors ${openDropdown === 'Defend' ? 'bg-border' : ''}`}>
                            <ShieldIcon className="w-5 h-5 text-accent-purple"/> Defend
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'Defend' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'Defend' && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg p-2 z-50 shadow-lg shadow-purple-500/10 space-y-1">
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('PLANNER'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'PLANNER' ? 'bg-primary/20 text-primary' : ''}`}><LayoutDashboardIcon className="w-4 h-4" /> Defence Planner</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('THREAT_HUNT'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'THREAT_HUNT' ? 'bg-primary/20 text-primary' : ''}`}><CrosshairIcon className="w-4 h-4" /> Threat Hunt</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('SIEM'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'SIEM' ? 'bg-primary/20 text-primary' : ''}`}><ChainIcon className="w-4 h-4" /> SIEM Integration</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('VALIDATION'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'VALIDATION' ? 'bg-primary/20 text-primary' : ''}`}><ZapIcon className="w-4 h-4" /> Control Validation</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('DETECTIQ'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'DETECTIQ' ? 'bg-primary/20 text-primary' : ''}`}><BrainCircuitIcon className="w-4 h-4" /> DetectIQ</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('IR_ASSIST'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'IR_ASSIST' ? 'bg-primary/20 text-primary' : ''}`}><FileSearchIcon className="w-4 h-4" /> IR Assist</button>
                                <button onClick={() => {setActiveView('DEFEND'); setDefendTab('IR_TABLETOP'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'DEFEND' && defendTab === 'IR_TABLETOP' ? 'bg-primary/20 text-primary' : ''}`}><BookTextIcon className="w-4 h-4" /> IR Tabletop</button>
                            </div>
                        )}
                    </div>

                    {currentUser.permissions.c2Access && (
                        <div ref={c2Ref} className="relative">
                            <button onClick={() => toggleDropdown('C2 Operations')} className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md hover:bg-border transition-colors ${openDropdown === 'C2 Operations' ? 'bg-border' : ''}`}>
                                <ServerIcon className="w-5 h-5 text-accent-orange"/> C2 Operations
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'C2 Operations' ? 'rotate-180' : ''}`} />
                            </button>
                            {openDropdown === 'C2 Operations' && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg p-2 z-50 shadow-lg shadow-orange-500/10 space-y-1">
                                    <button onClick={() => {setActiveView('OFFENSIVE_INFRA'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'OFFENSIVE_INFRA' ? 'bg-primary/20 text-primary' : ''}`}><NetworkIcon className="w-4 h-4" /> Offensive Infra (IaC)</button>
                                    <button onClick={() => {setActiveView('REDIRECTORS'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'REDIRECTORS' ? 'bg-primary/20 text-primary' : ''}`}><ServerIcon className="w-4 h-4" /> Redirectors</button>
                                    <button onClick={() => {setActiveView('LISTENERS'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'LISTENERS' ? 'bg-primary/20 text-primary' : ''}`}><ActivityIcon className="w-4 h-4" /> Listeners</button>
                                    <button onClick={() => {setActiveView('AGENTS'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'AGENTS' ? 'bg-primary/20 text-primary' : ''}`}><UsersIcon className="w-4 h-4" /> Agents</button>
                                    <button onClick={() => {setActiveView('LOOT'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'LOOT' ? 'bg-primary/20 text-primary' : ''}`}><DatabaseIcon className="w-4 h-4" /> Loot</button>
                                    {currentUser.permissions.agentBuilderAccess && <button onClick={() => {setActiveView('AGENT_BUILDER'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'AGENT_BUILDER' ? 'bg-primary/20 text-primary' : ''}`}><PackageIcon className="w-4 h-4" /> Agent Builder</button>}
                                </div>
                            )}
                        </div>
                    )}

                    <div ref={platformRef} className="relative">
                        <button onClick={() => toggleDropdown('Platform')} className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md hover:bg-border transition-colors ${openDropdown === 'Platform' ? 'bg-border' : ''}`}>
                            <LayoutDashboardIcon className="w-5 h-5 text-accent-purple"/> Platform
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'Platform' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'Platform' && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg p-2 z-50 shadow-lg shadow-purple-500/10 space-y-1">
                                <button onClick={() => {setActiveView('REPORTING'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'REPORTING' ? 'bg-primary/20 text-primary' : ''}`}><ClipboardListIcon className="w-4 h-4" /> Reporting</button>
                                <button onClick={() => {setActiveView('EVENT_LOG'); setOpenDropdown(null);}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent ${activeView === 'EVENT_LOG' ? 'bg-primary/20 text-primary' : ''}`}><BookTextIcon className="w-4 h-4" /> Event Log</button>
                            </div>
                        )}
                    </div>
                </nav>
                <div className="ml-auto flex items-center gap-3 relative">
                     {currentUser.permissions.settingsAccess && (
                         <button onClick={() => setActiveView('SETTINGS')} className="p-2 rounded-md hover:bg-border transition-colors">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                     )}
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-md transition-colors"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                        <div className="text-right">
                            <p className="font-bold text-sm">{currentUser.name}</p>
                            <p className="text-xs text-muted-foreground">{currentUser.role}</p>
                        </div>
                        <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center font-bold text-primary-foreground border-2 border-primary/50">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                    
                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-border text-xs font-bold text-muted-foreground bg-black/40">SWITCH USER (DEBUG)</div>
                            {MOCK_USERS.map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => { setCurrentUser(u); setIsUserMenuOpen(false); setActiveView('DASHBOARD'); showToast(`Switched to user: ${u.name}`); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center justify-between ${currentUser.id === u.id ? 'bg-primary/10 text-primary' : ''}`}
                                >
                                    <span>{u.name}</span>
                                    <span className="text-xs opacity-50">{u.role}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                 {activeView === 'DASHBOARD' && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <ImperiumLogo className="max-w-xl max-h-full opacity-50" />
                    </div>
                 )}
                 {activeView === 'WEAPONIZATION' && (
                    <div className="flex flex-1 gap-4 overflow-hidden">
                        {/* Left Panel: Controls */}
                        <div className="w-[450px] bg-black/30 border border-border rounded-lg flex flex-col">
                            <div className="p-4 border-b border-border"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><SkullIcon/> Weaponization</h2></div>
                            <div className="p-4 border-b border-border">
                                <form onSubmit={e => { e.preventDefault(); handleParseCommand(); }} className="flex gap-2">
                                    <input type="text" value={command} onChange={e => setCommand(e.target.value)} placeholder="Describe your objective..." className={baseInputStyles} />
                                    <button type="submit" className={`${primaryButtonStyles} w-auto px-4`}><BotIcon className="w-4 h-4"/></button>
                                </form>
                            </div>
                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                <div><label className="text-xs font-bold text-muted-foreground">ATTACK TYPE</label><div className="relative"><select value={params.attackType} onChange={e => setParams(p => ({...p, attackType: e.target.value as AttackType}))} className={baseSelectStyles}>{Object.values(AttackType).filter(t => currentUser.permissions.scriptEngineAccess.allowedAttackTypes.includes(t)).map(t => <option key={t}>{t}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                 {params.attackType === AttackType.CUSTOM_VULNERABILITY ? (
                                    <>
                                        <div className="flex gap-2">
                                            <input type="text" value={vulnIdentifier} onChange={e => setVulnIdentifier(e.target.value)} placeholder="CVE-202X-XXXX or URL" className={baseInputStyles} />
                                            <button onClick={handleFetchVulnDetails} className={`${secondaryButtonStyles} w-auto text-sm`}>Fetch</button>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">VULNERABILITY DETAILS</label>
                                            <textarea value={vulnerabilityDetails} onChange={e => { setVulnerabilityDetails(e.target.value); setParams(p => ({...p, objective: e.target.value}))}} className={`${baseInputStyles} min-h-[100px]`}></textarea>
                                        </div>
                                    </>
                                ) : (
                                     <div><label className="text-xs font-bold text-muted-foreground">OBJECTIVE</label><textarea value={params.objective} onChange={e => setParams(p => ({...p, objective: e.target.value}))} className={`${baseInputStyles} min-h-[80px]`}></textarea></div>
                                )}
                                <div><label className="text-xs font-bold text-muted-foreground">LANGUAGE</label><div className="relative"><select value={params.language} onChange={e => setParams(p => ({...p, language: e.target.value as CodeLanguage}))} className={baseSelectStyles}>{Object.values(CodeLanguage).map(l => <option key={l}>{l}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="text-xs font-bold text-muted-foreground">OS</label><div className="relative"><select value={params.target.os} onChange={e => setParams(p => ({...p, target: {...p.target, os: e.target.value as TargetOS, version: OS_VERSIONS[e.target.value as TargetOS][0]}}))} className={baseSelectStyles}>{Object.values(TargetOS).map(os => <option key={os}>{os}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                    <div className="col-span-2"><label className="text-xs font-bold text-muted-foreground">VERSION</label><div className="relative"><select value={params.target.version} onChange={e => setParams(p => ({...p, target: {...p.target, version: e.target.value}}))} className={baseSelectStyles}>{OS_VERSIONS[params.target.os].map(v => <option key={v}>{v}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                </div>
                                <div><label className="text-xs font-bold text-muted-foreground">OBFUSCATION LEVEL ({obfuscationLevel})</label><input type="range" min="0" max="3" value={obfuscationLevel} onChange={e => setObfuscationLevel(Number(e.target.value))} className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"/></div>
                            </div>
                            <div className="p-4 border-t border-border"><button onClick={handleGenerateCode} className={primaryButtonStyles}><SparklesIcon className="w-4 h-4 mr-2"/> Generate Code</button></div>
                        </div>

                        {/* Right Panel: Editor & Analysis */}
                        <div className="flex-1 bg-black/30 border border-border rounded-lg flex flex-col overflow-hidden">
                            <div className="flex border-b border-border">
                                {Object.entries({CODE: CodeIcon, LOG: TerminalIcon, EVASION_ANALYSIS: ShieldIcon, POST_EXEC_ANALYSIS: FlaskConicalIcon}).map(([tab, Icon]) => (
                                    <button key={tab} onClick={() => setWeaponizationTab(tab as WeaponizationTab)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${weaponizationTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}><Icon className="w-4 h-4" /> {tab.replace('_', ' ')}</button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                {weaponizationTab === 'CODE' && (<div className="h-full flex flex-col"><div className="flex-1 relative">{isEditorReady ? <CodeEditor value={generatedCode} onChange={setGeneratedCode} onFileDrop={handleFileDrop} language={MONACO_LANGUAGE_MAP[params.language]} editorRef={editorRef} onSelectionChange={() => {}} /> : <Loader message="Loading Editor..." />}</div><div className="p-2 border-t border-border flex gap-2 items-center"><input type="text" placeholder="Vault Item Name" value={vaultItemName} onChange={e => setVaultItemName(e.target.value)} className={`${baseInputStyles} w-1/3 text-xs`}/><button onClick={handleSaveToVault} className={`${secondaryButtonStyles} w-auto text-xs`}><SaveIcon className="w-4 h-4 mr-1"/> Save</button><button onClick={handleSimulateExecution} disabled={!generatedCode || generatedCode.startsWith('// Your generated')} className={`${secondaryButtonStyles} w-auto text-xs`}><TerminalIcon className="w-4 h-4 mr-1"/> Simulate</button><button onClick={handleAnalyzeEvasion} disabled={!generatedCode || generatedCode.startsWith('// Your generated')} className={`${secondaryButtonStyles} w-auto text-xs`}><ShieldIcon className="w-4 h-4 mr-1"/> Analyze Evasion</button></div></div>)}
                                {weaponizationTab === 'LOG' && <div className="p-4 font-mono text-sm whitespace-pre-wrap overflow-auto h-full"><pre>{executionLog}</pre>{executionLog && <div className="p-4 border-t border-border"><button onClick={handleAnalyzeLog} className={`${primaryButtonStyles}`}>Analyze Log</button></div>}</div>}
                                {weaponizationTab === 'EVASION_ANALYSIS' && <div className="overflow-auto h-full"><MarkdownRenderer content={evasionAnalysis} /></div>}
                                {weaponizationTab === 'POST_EXEC_ANALYSIS' && <div className="overflow-auto h-full"><MarkdownRenderer content={postExecAnalysis} />{postExecAnalysis && <div className="p-4"><button onClick={handleApplyRecommendations} className={`${primaryButtonStyles}`}>Apply Recommendations</button></div>}</div>}
                            </div>
                        </div>
                    </div>
                )}
                 {activeView === 'RECON' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><SearchIcon/> Reconnaissance</h2></div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/4 border-r border-border p-2">
                                {(['OSINT', 'SPIDERFOOT', 'SCAN', 'JS_ANALYSIS'] as ReconTab[]).map(tab => <button key={tab} onClick={() => setReconTab(tab)} className={`w-full text-left p-3 rounded-md font-semibold ${reconTab === tab ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}>{tab}</button>)}
                            </div>
                            <div className="w-3/4 flex flex-col">
                                <div className="p-4 border-b border-border">
                                    {reconTab === 'OSINT' && <form onSubmit={e => {e.preventDefault(); handlePerformOsint();}} className="flex gap-2 items-center"><input type="text" value={osintTarget} onChange={e => setOsintTarget(e.target.value)} placeholder="Enter target (domain, IP)" className={baseInputStyles}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useMcp} onChange={e => setUseMcp(e.target.checked)} className="accent-primary"/>MCP</label><button type="submit" className={`${primaryButtonStyles} w-auto`}>Scan</button></form>}
                                    {reconTab === 'SPIDERFOOT' && <div className="flex gap-2"><input type="file" accept=".json" onChange={e => {const file = e.target.files?.[0]; if(file) {const reader=new FileReader(); reader.onload = ev => setSpiderfootJsonContent(ev.target?.result as string); reader.readAsText(file);}}} className={`${baseInputStyles} file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80`} /><button onClick={handleAnalyzeSpiderfoot} disabled={!spiderfootJsonContent} className={primaryButtonStyles}>Analyze</button></div>}
                                    {reconTab === 'SCAN' && <button onClick={handleAnalyzeScan} className={primaryButtonStyles}>Analyze Scan Results</button>}
                                    {reconTab === 'JS_ANALYSIS' && <button onClick={handleAnalyzeJs} className={primaryButtonStyles}>Analyze JS Code</button>}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {reconTab === 'SCAN' && <textarea value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Paste vulnerability scan results (e.g., Nmap, Nessus)" className={`${baseInputStyles} h-full w-full rounded-none border-0`}></textarea>}
                                    {reconTab === 'JS_ANALYSIS' && <textarea value={jsCodeInput} onChange={e => setJsCodeInput(e.target.value)} placeholder="Paste JavaScript code to analyze for secrets and endpoints" className={`${baseInputStyles} h-full w-full rounded-none border-0`}></textarea>}
                                    {(reconTab === 'OSINT' || reconTab === 'SPIDERFOOT') && <MarkdownRenderer content={reconReport} />}
                                    {reconTab === 'SCAN' && reconReport && <VulnerabilityReport report={reconReport} onWeaponize={handleWeaponizeFromReport} />}
                                    {(reconTab === 'JS_ANALYSIS') && reconReport && <MarkdownRenderer content={reconReport} />}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeView === 'ATTACK_PLAN' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><LayoutDashboardIcon/> Mission Planning</h2></div>
                        <div className="p-4 border-b border-border"><form onSubmit={e => {e.preventDefault(); handlePlanMission();}} className="flex gap-2"><input type="text" value={missionObjective} onChange={e => setMissionObjective(e.target.value)} placeholder="Enter high-level mission objective..." className={baseInputStyles} /><button type="submit" className={`${primaryButtonStyles} w-auto`}>Plan Mission</button></form></div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {parsedPlan.length > 0 ? (
                                <div className="space-y-4">
                                    {parsedPlan.map((step, index) => (
                                        <div key={index} className="bg-input border border-border p-4 rounded-lg">
                                            <p className="font-bold">{index + 1}. {step.action}</p>
                                            <div className="flex items-center gap-4 text-xs mt-2 text-muted-foreground">
                                                <span><strong>Type:</strong> {step.attackType}</span>
                                                <span><strong>Lang:</strong> {step.language}</span>
                                                <span><strong>OS:</strong> {step.targetOS}</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setParams({
                                                        objective: step.action,
                                                        attackType: step.attackType,
                                                        language: step.language,
                                                        target: {
                                                            os: step.targetOS,
                                                            version: OS_VERSIONS[step.targetOS][0],
                                                            architecture: 'x86_64',
                                                        }
                                                    });
                                                    setActiveView('WEAPONIZATION');
                                                }}
                                                className="mt-3 text-sm bg-primary/20 text-primary font-bold py-1 px-3 rounded-md hover:bg-primary/40 transition-all">
                                                Weaponize This Step
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <MarkdownRenderer content={missionPlan || "Enter an objective and click 'Plan Mission' to begin."} />
                            )}
                        </div>
                    </div>
                )}
                 {activeView === 'SHELLCODE' && (
                    <div className="flex h-full gap-4">
                        <div className="w-1/3 bg-black/30 border border-border rounded-lg flex flex-col">
                            <div className="p-4 border-b border-border"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><BracesIcon/> Shellcode Generator</h2></div>
                            <div className="p-4 space-y-4">
                                <div><label className="text-xs font-bold text-muted-foreground">LHOST</label><input type="text" value={shellcodeParams.lhost} onChange={e => setShellcodeParams(p => ({ ...p, lhost: e.target.value }))} className={baseInputStyles} /></div>
                                <div><label className="text-xs font-bold text-muted-foreground">LPORT</label><input type="text" value={shellcodeParams.lport} onChange={e => setShellcodeParams(p => ({ ...p, lport: e.target.value }))} className={baseInputStyles} /></div>
                                <div><label className="text-xs font-bold text-muted-foreground">PAYLOAD TYPE</label><div className="relative"><select value={shellcodeParams.shellType} onChange={e => setShellcodeParams(p => ({...p, shellType: e.target.value}))} className={baseSelectStyles}>{SHELL_TYPES.map(t => <option key={t}>{t}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <div><label className="text-xs font-bold text-muted-foreground">ENCODER</label><div className="relative"><select value={shellcodeParams.encoder} onChange={e => setShellcodeParams(p => ({...p, encoder: e.target.value}))} className={baseSelectStyles}>{ENCODERS.map(e => <option key={e}>{e}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <div><label className="text-xs font-bold text-muted-foreground">OUTPUT FORMAT</label><div className="relative"><select value={shellcodeParams.outputFormat} onChange={e => setShellcodeParams(p => ({...p, outputFormat: e.target.value}))} className={baseSelectStyles}>{Object.entries(OUTPUT_FORMATS).map(([val, name]) => <option key={val} value={val}>{name}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                            </div>
                             <div className="p-4 mt-auto border-t border-border"><button onClick={handleGenerateShellcode} className={primaryButtonStyles}>Generate</button></div>
                        </div>
                        <div className="w-2/3 bg-black/30 border border-border rounded-lg flex flex-col">
                             <div className="flex-1 overflow-hidden">{isEditorReady ? <CodeEditor value={generatedShellcode} onChange={setGeneratedShellcode} onFileDrop={()=>{}} language={MONACO_LANGUAGE_MAP[shellcodeParams.outputFormat] || 'plaintext'} /> : <Loader message="Loading Editor..." />}</div>
                        </div>
                    </div>
                )}
                {activeView === 'CHAINER' && (
                     <div className="flex h-full gap-4">
                        <div className="w-1/3 bg-black/30 border border-border rounded-lg flex flex-col">
                           <div className="p-4 border-b border-border"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><ChainIcon/> Payload Chainer</h2></div>
                           <div className="p-4 flex-1 overflow-y-auto space-y-2">
                               {vault.map(item => (
                                   <div key={item.id} className="flex items-center gap-3 bg-input p-2 rounded-md">
                                       <input type="checkbox" checked={payloadChain.some(c => c.id === item.id)} onChange={e => e.target.checked ? setPayloadChain(p => [...p, item]) : setPayloadChain(p => p.filter(c => c.id !== item.id))} className="accent-primary" />
                                       <div>
                                           <p className="font-semibold">{item.name}</p>
                                           <p className="text-xs text-muted-foreground">{item.params.language} / {item.params.attackType}</p>
                                       </div>
                                   </div>
                               ))}
                           </div>
                        </div>
                        <div className="w-2/3 bg-black/30 border border-border rounded-lg flex flex-col">
                            <div className="p-4 border-b border-border">
                                <h3 className="text-lg font-bold">Chain Configuration</h3>
                                <div className="mt-2 flex gap-2">
                                    <button onClick={handleChainPayloads} disabled={payloadChain.length < 2} className={primaryButtonStyles}>Chain Payloads</button>
                                </div>
                            </div>
                           <div className="flex-1 overflow-hidden">{isEditorReady ? <CodeEditor value={chainedCode} onChange={setChainedCode} onFileDrop={()=>{}} language={MONACO_LANGUAGE_MAP[params.language]} /> : <Loader message="Loading Editor..." />}</div>
                        </div>
                     </div>
                )}
                {activeView === 'REDIRECTORS' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><ServerIcon/> Redirector Management</h2>
                            <button onClick={() => setIsRedirectorModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-2 px-3 rounded-md hover:bg-opacity-80 transition-all duration-300"><PlusIcon className="w-4 h-4" /> New Redirector</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="p-3">Name</th><th className="p-3">IP Address</th><th className="p-3">Type</th><th className="p-3">Tier</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                                <tbody>
                                    {redirectors.map(r => (
                                        <tr key={r.id} className="border-b border-border hover:bg-accent/50">
                                            <td className="p-3 font-mono">{r.name}</td>
                                            <td className="p-3 font-mono">{r.ip}</td>
                                            <td className="p-3 font-mono">{r.type}</td>
                                            <td className="p-3 font-mono">{r.tier}</td>
                                            <td className={`p-3 font-bold ${r.status === 'Healthy' ? 'text-accent-green' : r.status === 'Degraded' ? 'text-accent-orange' : 'text-destructive'}`}>{r.status.toUpperCase()}</td>
                                            <td className="p-3"><button className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40" onClick={() => c2Service.deleteRedirector(r.id).then(refreshRedirectors)}>Delete</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeView === 'LISTENERS' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><ActivityIcon/> Listener Management</h2>
                            <button onClick={() => setIsListenerModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-2 px-3 rounded-md hover:bg-opacity-80 transition-all duration-300"><PlusIcon className="w-4 h-4" /> New Listener</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-0 bg-background">
                                    <tr className="border-b border-border">
                                        <th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Bind To</th><th className="p-3">Host:Port</th><th className="p-3">Status</th><th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listeners.map(l => (
                                        <tr key={l.id} className="border-b border-border hover:bg-accent/50">
                                            <td className="p-3 font-mono">{l.name}</td>
                                            <td className="p-3 font-mono">{l.type}</td>
                                            <td className="p-3 font-mono">{redirectors.find(r => r.id === l.redirectorId)?.name || 'Direct C2'}</td>
                                            <td className="p-3 font-mono">{l.host}:{l.port}</td>
                                            <td className={`p-3 font-bold ${l.status === 'active' ? 'text-accent-green' : 'text-muted-foreground'}`}>{l.status.toUpperCase()}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/40" onClick={() => c2Service.toggleListenerStatus(l.id, 'active').then(refreshListeners)}>Start</button>
                                                    <button className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded hover:bg-yellow-500/40" onClick={() => c2Service.toggleListenerStatus(l.id, 'inactive').then(refreshListeners)}>Stop</button>
                                                    <button className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40" onClick={() => c2Service.deleteListener(l.id).then(refreshListeners)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeView === 'AGENTS' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><UsersIcon/> Agent Management</h2>
                        </div>
                         <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-0 bg-background">
                                    <tr className="border-b border-border"><th className="p-3">OS</th><th className="p-3">Hostname</th><th className="p-3">User@IP</th><th className="p-3">Privileges</th><th className="p-3">Listener</th><th className="p-3">Last Seen</th><th className="p-3">Status</th></tr>
                                </thead>
                                <tbody>
                                    {agents.length > 0 ? agents.map(a => (
                                        <tr key={a.id} className="border-b border-border hover:bg-accent/50 cursor-pointer" onClick={() => setSelectedAgent(a)}>
                                            <td className="p-3">{a.os}</td><td className="p-3">{a.hostname}</td><td className="p-3">{a.user}@{a.ip}</td><td className="p-3 font-semibold">{a.privileges}</td><td className="p-3">{a.listener}</td><td className="p-3">{new Date(a.lastSeen).toLocaleString()}</td>
                                            <td className={`p-3 font-bold ${a.status === 'active' ? 'text-accent-green' : a.status === 'stale' ? 'text-accent-orange' : 'text-destructive'}`}>{a.status.toUpperCase()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="text-center p-8 text-muted-foreground">
                                                No agents have checked in. Deploy an agent payload on a target system.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                 {activeView === 'LOOT' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex gap-4 items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><DatabaseIcon/> Loot Collection</h2>
                            <div className="flex gap-2 ml-auto">
                                <div className="relative"><select value={lootFilter.agentId} onChange={e => setLootFilter(p => ({ ...p, agentId: e.target.value }))} className={`${baseSelectStyles} w-48`}><option value="">All Agents</option>{agents.map(a => <option key={a.id} value={a.id}>{a.hostname}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div>
                                <div className="relative"><select value={lootFilter.type} onChange={e => setLootFilter(p => ({ ...p, type: e.target.value }))} className={`${baseSelectStyles} w-48`}><option value="">All Types</option><option value="credential">Credential</option><option value="file">File</option><option value="screenshot">Screenshot</option><option value="keystrokes">Keystrokes</option><option value="browser_artefacts">Browser Artefacts</option><option value="network_data">Network Data</option><option value="system_output">System Output</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="p-3">Agent</th><th className="p-3">Type</th><th className="p-3">Source</th><th className="p-3">Content</th><th className="p-3">Timestamp</th></tr></thead>
                                <tbody>
                                     {filteredLoot.length > 0 ? filteredLoot.map(l => (
                                        <tr key={l.id} className="border-b border-border hover:bg-accent/50">
                                            <td className="p-3 font-mono">{agents.find(a => a.id === l.agentId)?.hostname || l.agentId}</td><td className="p-3 font-mono">{l.type.replace('_',' ')}</td><td className="p-3 font-mono">{l.source}</td><td className="p-3 font-mono max-w-sm truncate">{l.content}</td><td className="p-3 font-mono">{new Date(l.timestamp).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-muted-foreground">
                                                No loot has been collected. Task an agent to gather intelligence.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeView === 'AGENT_BUILDER' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><PackageIcon/> Agent Builder</h2>
                        </div>
                        <div className="flex-1 p-4 grid grid-cols-3 gap-4">
                            <div className="col-span-1 space-y-4 overflow-y-auto pr-2">
                                <div><label className="text-xs font-bold text-muted-foreground">PAYLOAD TYPE</label><div className="relative"><select value={agentBuildConfig.payloadType} onChange={e => setAgentBuildConfig(p => ({...p, payloadType: e.target.value as PayloadType}))} className={baseSelectStyles}>{Object.values(PayloadType).map(pt => <option key={pt} value={pt}>{pt}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <div><label className="text-xs font-bold text-muted-foreground">LISTENER</label><div className="relative"><select value={agentBuildConfig.listenerId} onChange={e => setAgentBuildConfig(p => ({...p, listenerId: e.target.value}))} className={baseSelectStyles} disabled={listeners.length === 0}>{listeners.length > 0 ? listeners.map(l => <option key={l.id} value={l.id}>{l.name}</option>) : <option>Create a listener first</option>}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                <fieldset className="border border-border p-3 rounded-lg"><legend className="px-2 text-sm font-bold">Build Target</legend><div className="space-y-4 pt-2"><div><label className="text-xs font-bold text-muted-foreground">OPERATING SYSTEM</label><div className="relative"><select value={agentBuildConfig.os} onChange={e => setAgentBuildConfig(p => ({...p, os: e.target.value as TargetOS}))} className={baseSelectStyles}>{Object.values(TargetOS).map(os => <option key={os}>{os}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">ARCHITECTURE</label><div className="relative"><select value={agentBuildConfig.arch} onChange={e => setAgentBuildConfig(p => ({...p, arch: e.target.value}))} className={baseSelectStyles}><option>x86_64</option><option>x86</option><option>ARM</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">EXECUTION MODEL</label><div className="relative"><select value={agentBuildConfig.executionModel} onChange={e => setAgentBuildConfig(p => ({...p, executionModel: e.target.value as any}))} className={baseSelectStyles}><option>stageless</option><option>staged</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div></fieldset>
                                <fieldset className="border border-border p-3 rounded-lg"><legend className="px-2 text-sm font-bold">Evasion & Capabilities</legend><div className="space-y-2 pt-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agentBuildConfig.amsiBypass} onChange={e => setAgentBuildConfig(p => ({ ...p, amsiBypass: e.target.checked }))} className="accent-primary w-4 h-4"/>AMSI/ETW Bypass</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agentBuildConfig.etwBypass} onChange={e => setAgentBuildConfig(p => ({ ...p, etwBypass: e.target.checked }))} className="accent-primary w-4 h-4"/>Encrypted Configuration</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agentBuildConfig.persistence} onChange={e => setAgentBuildConfig(p => ({ ...p, persistence: e.target.checked }))} className="accent-primary w-4 h-4"/>Add Persistence</label></div></fieldset>
                                <button onClick={handleGenerateAgentPayload} className={`${primaryButtonStyles} mt-auto`} disabled={listeners.length === 0}>Generate Payload</button>
                            </div>
                            <div className="col-span-2 bg-input rounded-md font-mono text-sm p-0 flex flex-col overflow-hidden">
                                {isEditorReady ? <CodeEditor value={generatedAgentPayload} onChange={setGeneratedAgentPayload} onFileDrop={()=>{}} language={MONACO_LANGUAGE_MAP[agentBuildConfig.payloadType] || 'powershell'} readOnly /> : <Loader message="Loading Editor..." />}
                            </div>
                        </div>
                    </div>
                )}
                 {activeView === 'OFFENSIVE_INFRA' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><NetworkIcon/> Offensive Infrastructure (IaC) Planner</h2>
                        </div>
                        <div className="flex-1 p-6 w-full overflow-y-auto">
                            <div className="max-w-6xl mx-auto space-y-6">
                                <p className="text-sm text-muted-foreground">Design a multi-layered, secure, and disposable C2 infrastructure. The AI will generate an IaC plan to deploy this setup, which you can then review in the Weaponization workbench.</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <fieldset className="p-4 border border-border rounded-lg space-y-4 bg-input/30"><legend className="px-2 font-bold text-accent-green">Core Configuration</legend><div><label className="text-xs font-bold text-muted-foreground">IaC TOOL</label><div className="relative"><select value={iacConfig.iacTool} onChange={e => setIacConfig(p => ({...p, iacTool: e.target.value as CodeLanguage}))} className={baseSelectStyles}>{Object.values(CodeLanguage).filter(l => l === CodeLanguage.TERRAFORM || l === CodeLanguage.ANSIBLE).map(l => <option key={l} value={l}>{l}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">CLOUD PROVIDER</label><div className="relative"><select value={iacConfig.cloudProvider} onChange={e => setIacConfig(p => ({...p, cloudProvider: e.target.value as CloudProvider}))} className={baseSelectStyles}>{Object.values(CloudProvider).map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">C2 DOMAIN</label><input type="text" value={iacConfig.c2Domain} onChange={e => setIacConfig(p => ({...p, c2Domain: e.target.value}))} className={baseInputStyles} /></div></fieldset>
                                        <fieldset className="p-4 border border-border rounded-lg space-y-4 bg-input/30"><legend className="px-2 font-bold text-accent-green">C2 Server</legend><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-muted-foreground">C2 FRAMEWORK</label><div className="relative"><select value={iacConfig.c2Framework} onChange={e => setIacConfig(p => ({...p, c2Framework: e.target.value as C2Framework}))} className={baseSelectStyles}>{Object.values(C2Framework).map(f => <option key={f} value={f}>{f}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">VM SIZE</label><div className="relative"><select value={iacConfig.c2VmSize} disabled={iacConfig.c2Framework === C2Framework.IMPERIUM} onChange={e => setIacConfig(p => ({...p, c2VmSize: e.target.value as VmSize}))} className={baseSelectStyles}>{Object.values(VmSize).map(s => <option key={s} value={s}>{s}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div>{iacConfig.c2Framework === C2Framework.IMPERIUM && <p className="text-xs text-accent-orange p-2 bg-accent-orange/10 rounded-md">The C2 server will be this platform. Only redirector infrastructure will be deployed.</p>}</fieldset>
                                        <fieldset className="p-4 border border-border rounded-lg space-y-4 bg-input/30"><legend className="px-2 font-bold text-accent-orange">Edge Redirectors</legend><div className="space-y-4"><h4 className="font-bold flex items-center gap-2"><input type="checkbox" checked={iacConfig.enableEdgeHttp} onChange={e => setIacConfig(p => ({...p, enableEdgeHttp: e.target.checked}))} className="accent-primary w-4 h-4"/>HTTP/S</h4>{iacConfig.enableEdgeHttp && <div className="space-y-4 pl-6"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-muted-foreground">REVERSE PROXY</label><div className="relative"><select value={iacConfig.edgeHttpProxy} onChange={e => setIacConfig(p => ({...p, edgeHttpProxy: e.target.value as ReverseProxy}))} className={baseSelectStyles}>{Object.values(ReverseProxy).map(p => <option key={p}>{p}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">SSL/TLS</label><div className="relative"><select value={iacConfig.edgeHttpSsl} onChange={e => setIacConfig(p => ({...p, edgeHttpSsl: e.target.value}))} className={baseSelectStyles}><option>Let's Encrypt</option><option>Self-Signed</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div><div><label className="text-xs font-bold text-muted-foreground">REDIRECT NON-C2 TRAFFIC TO</label><input type="text" value={iacConfig.edgeHttpRedirectUrl} onChange={e => setIacConfig(p => ({...p, edgeHttpRedirectUrl: e.target.value}))} className={baseInputStyles} /></div></div>}</div><div className="space-y-4 border-t border-border pt-4"><h4 className="font-bold flex items-center gap-2"><input type="checkbox" checked={iacConfig.enableEdgeDns} onChange={e => setIacConfig(p => ({...p, enableEdgeDns: e.target.checked}))} className="accent-primary w-4 h-4"/>DNS</h4></div></fieldset>
                                    </div>
                                    <div className="space-y-6">
                                        <fieldset className="p-4 border border-border rounded-lg space-y-4 bg-input/30"><legend className="px-2 font-bold text-accent-purple">Secure Overlay Network</legend><h4 className="font-bold flex items-center gap-2"><input type="checkbox" checked={iacConfig.enableOverlay} onChange={e => setIacConfig(p => ({...p, enableOverlay: e.target.checked}))} className="accent-primary w-4 h-4"/>Enable Overlay</h4>{iacConfig.enableOverlay && <div className="space-y-4 pl-6"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-muted-foreground">SOFTWARE</label><div className="relative"><select value={iacConfig.overlaySoftware} onChange={e => setIacConfig(p => ({...p, overlaySoftware: e.target.value as OverlaySoftware}))} className={baseSelectStyles}>{Object.values(OverlaySoftware).map(s => <option key={s}>{s}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div><div><label className="text-xs font-bold text-muted-foreground">LIGHTHOUSE VM</label><div className="relative"><select value={iacConfig.lighthouseVmSize} onChange={e => setIacConfig(p => ({...p, lighthouseVmSize: e.target.value as VmSize}))} className={baseSelectStyles}>{Object.values(VmSize).map(s => <option key={s}>{s}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div></div>}</fieldset>
                                        <fieldset className="p-4 border border-border rounded-lg space-y-4 bg-input/30"><legend className="px-2 font-bold text-accent-purple">Internal Redirectors</legend><div className="space-y-4"><h4 className="font-bold flex items-center gap-2"><input type="checkbox" checked={iacConfig.enableInternalHttp} onChange={e => setIacConfig(p => ({...p, enableInternalHttp: e.target.checked}))} className="accent-primary w-4 h-4"/>HTTP/S</h4>{iacConfig.enableInternalHttp && <div className="space-y-4 pl-6"><div><label className="text-xs font-bold text-muted-foreground">FORWARDING METHOD</label><div className="relative"><select value={iacConfig.internalHttpForwarder} onChange={e => setIacConfig(p => ({...p, internalHttpForwarder: e.target.value as ForwardingMethod}))} className={baseSelectStyles}>{Object.values(ForwardingMethod).map(m => <option key={m}>{m}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div>}</div><div className="space-y-4 border-t border-border pt-4"><h4 className="font-bold flex items-center gap-2"><input type="checkbox" checked={iacConfig.enableInternalDns} onChange={e => setIacConfig(p => ({...p, enableInternalDns: e.target.checked}))} className="accent-primary w-4 h-4"/>DNS</h4>{iacConfig.enableInternalDns && <div className="space-y-4 pl-6"><div><label className="text-xs font-bold text-muted-foreground">FORWARDING METHOD</label><div className="relative"><select value={iacConfig.internalDnsForwarder} onChange={e => setIacConfig(p => ({...p, internalDnsForwarder: e.target.value as ForwardingMethod}))} className={baseSelectStyles}>{Object.values(ForwardingMethod).map(m => <option key={m}>{m}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div></div>}</div></fieldset>
                                    </div>
                                </div>
                                <div className="pt-4"><button onClick={handlePrepareIacPlan} className={primaryButtonStyles}><SparklesIcon className="w-4 h-4 mr-2" />Prepare IaC Generation Plan</button></div>
                            </div>
                        </div>
                    </div>
                )}
                {activeView === 'DEFEND' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex justify-between items-center"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><ShieldIcon/> Defend</h2></div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/4 border-r border-border p-2 space-y-1">
                                <button onClick={() => setDefendTab('PLANNER')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'PLANNER' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><LayoutDashboardIcon className="w-4 h-4" /> Defence Planner</button>
                                <button onClick={() => setDefendTab('THREAT_HUNT')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'THREAT_HUNT' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><CrosshairIcon className="w-4 h-4" /> Threat Hunt</button>
                                <button onClick={() => setDefendTab('SIEM')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'SIEM' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><ChainIcon className="w-4 h-4" /> SIEM Integration</button>
                                <button onClick={() => setDefendTab('VALIDATION')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'VALIDATION' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><ZapIcon className="w-4 h-4" /> Control Validation</button>
                                <button onClick={() => setDefendTab('DETECTIQ')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'DETECTIQ' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><BrainCircuitIcon className="w-4 h-4" /> DetectIQ</button>
                                <button onClick={() => setDefendTab('IR_ASSIST')} className={`w-full text-left p-3 rounded-md font-semibold flex items-center gap-2 ${defendTab === 'IR_ASSIST' ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}><FileSearchIcon className="w-4 h-4" /> IR Assist</button>
                            </div>
                            <div className="w-3/4 flex flex-col">
                                {defendTab === 'PLANNER' && (
                                    <>
                                        <div className="p-4 border-b border-border"><form onSubmit={e => {e.preventDefault(); handlePlanDefenceMission();}} className="flex gap-2"><input type="text" value={defenceObjective} onChange={e => setDefenceObjective(e.target.value)} placeholder="Enter high-level security objective..." className={baseInputStyles} /><button type="submit" className={`${primaryButtonStyles} w-auto`}>Generate Plan</button></form></div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            {parsedDefencePlan.length > 0 ? (
                                                <div className="space-y-4">
                                                    {parsedDefencePlan.map((step, index) => (
                                                        <div key={index} className="bg-input border border-border p-4 rounded-lg">
                                                            <p className="font-bold">{index + 1}. {step.action}</p>
                                                            <div className="flex items-center gap-4 text-xs mt-2 text-muted-foreground">
                                                                <span><strong>Type:</strong> {step.attackType}</span>
                                                                <span><strong>Lang/Tech:</strong> {step.language}</span>
                                                                <span><strong>Target:</strong> {step.targetOS}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleWeaponizeDefenceStep(step)}
                                                                className="mt-3 text-sm bg-primary/20 text-primary font-bold py-1 px-3 rounded-md hover:bg-primary/40 transition-all">
                                                                Weaponize This Step
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <MarkdownRenderer content={defencePlan || "Enter an objective (e.g., 'Harden our public web servers against ransomware') to generate a defensive plan."} />
                                            )}
                                        </div>
                                    </>
                                )}
                                 {defendTab === 'THREAT_HUNT' && (
                                    <div className="flex-1 flex gap-4 overflow-hidden p-4">
                                        <div className="w-[450px] bg-background border border-border rounded-lg flex flex-col">
                                            <div className="p-4 border-b border-border"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><CrosshairIcon/> Threat Hunting Workbench</h2></div>
                                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                                <div><label className="text-xs font-bold text-muted-foreground">OBJECTIVE</label><textarea value={threatHuntParams.objective} onChange={e => setThreatHuntParams(p => ({...p, objective: e.target.value}))} placeholder="e.g., Find processes making network connections to non-standard ports" className={`${baseInputStyles} min-h-[120px]`}></textarea></div>
                                                <div><label className="text-xs font-bold text-muted-foreground">LANGUAGE / FORMAT</label><div className="relative"><select value={threatHuntParams.language} onChange={e => setThreatHuntParams(p => ({...p, language: e.target.value as CodeLanguage}))} className={baseSelectStyles}>{Object.values(CodeLanguage).map(l => <option key={l}>{l}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div><label className="text-xs font-bold text-muted-foreground">OS</label><div className="relative"><select value={threatHuntParams.target.os} onChange={e => setThreatHuntParams(p => ({...p, target: {...p.target, os: e.target.value as TargetOS, version: OS_VERSIONS[e.target.value as TargetOS][0]}}))} className={baseSelectStyles}>{Object.values(TargetOS).map(os => <option key={os}>{os}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                                    <div className="col-span-2"><label className="text-xs font-bold text-muted-foreground">VERSION</label><div className="relative"><select value={threatHuntParams.target.version} onChange={e => setThreatHuntParams(p => ({...p, target: {...p.target, version: e.target.value}}))} className={baseSelectStyles}>{OS_VERSIONS[threatHuntParams.target.os].map(v => <option key={v}>{v}</option>)}</select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-border"><button onClick={handleGenerateThreatHuntCode} className={primaryButtonStyles}><SparklesIcon className="w-4 h-4 mr-2"/> Generate Code</button></div>
                                        </div>
                                        <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
                                            <div className="flex border-b border-border">
                                                {( [['CODE', CodeIcon], ['LOG', TerminalIcon], ['ANALYSIS', FlaskConicalIcon]] as [ThreatHuntAnalysisTab, React.FC<any>][]).map(([tab, Icon]) => (
                                                    <button key={tab} onClick={() => setThreatHuntAnalysisTab(tab)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${threatHuntAnalysisTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}><Icon className="w-4 h-4" /> {tab}</button>
                                                ))}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                {threatHuntAnalysisTab === 'CODE' && (<div className="h-full flex flex-col"><div className="flex-1 relative">{isEditorReady ? <CodeEditor value={threatHuntCode} onChange={setThreatHuntCode} onFileDrop={()=>{}} language={MONACO_LANGUAGE_MAP[threatHuntParams.language]} /> : <Loader message="Loading Editor..." />}</div><div className="p-2 border-t border-border flex gap-2 items-center"><input type="text" placeholder="Vault Item Name" value={threatHuntVaultItemName} onChange={e => setThreatHuntVaultItemName(e.target.value)} className={`${baseInputStyles} w-1/3 text-xs`}/><button onClick={handleSaveThreatHuntToVault} className={`${secondaryButtonStyles} w-auto text-xs`}><SaveIcon className="w-4 h-4 mr-1"/> Save</button><button onClick={handleSimulateThreatHuntCode} disabled={!threatHuntCode || threatHuntCode.startsWith('// Your generated')} className={`${secondaryButtonStyles} w-auto text-xs`}><TerminalIcon className="w-4 h-4 mr-1"/> Simulate</button></div></div>)}
                                                {threatHuntAnalysisTab === 'LOG' && <div className="p-4 font-mono text-sm whitespace-pre-wrap overflow-auto h-full"><pre>{threatHuntSimLog}</pre>{threatHuntSimLog && <div className="p-4 border-t border-border"><button onClick={handleAnalyzeThreatHuntLog} className={`${primaryButtonStyles}`}>Analyze Log</button></div>}</div>}
                                                {threatHuntAnalysisTab === 'ANALYSIS' && <div className="overflow-auto h-full p-4 space-y-4">
                                                    {parsedThreatHuntAnalysis ? (
                                                        <>
                                                            <div className="p-4 bg-input rounded-lg">
                                                                <h3 className="font-bold text-primary">Analysis Summary</h3>
                                                                <p className="text-sm mt-2">{parsedThreatHuntAnalysis.analysisSummary}</p>
                                                            </div>
                                                            {parsedThreatHuntAnalysis.improvements.map((category, catIndex) => (
                                                                <div key={catIndex} className="bg-input/50 border border-border rounded-lg p-4">
                                                                    <h4 className="font-bold text-lg text-accent-green">{category.category}</h4>
                                                                    <div className="mt-3 space-y-3">
                                                                        {category.suggestions.map((suggestion, sugIndex) => (
                                                                            <div key={sugIndex} className="bg-background/50 border border-border/70 rounded-md p-3">
                                                                                <label className="flex items-start gap-3 cursor-pointer">
                                                                                    <input 
                                                                                        type="checkbox" 
                                                                                        className="mt-1 accent-primary"
                                                                                        checked={selectedThreatHuntImprovements.some(s => s.title === suggestion.title)}
                                                                                        onChange={() => handleToggleThreatHuntImprovement(suggestion)}
                                                                                    />
                                                                                    <div>
                                                                                        <p className="font-semibold">{suggestion.title}</p>
                                                                                        <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                                                                                    </div>
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="pt-4"><button onClick={handleApplyThreatHuntRecommendations} disabled={selectedThreatHuntImprovements.length === 0} className={`${primaryButtonStyles}`}>Apply Selected Recommendations</button></div>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                            Run simulation and click "Analyze Log" to see recommendations.
                                                        </div>
                                                    )}
                                                </div>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {defendTab === 'SIEM' && (
                                    <div className="flex flex-col h-full">
                                        <div className="p-4 border-b border-border">
                                            <h3 className="text-lg font-bold text-primary mb-2">Elastic SIEM Workbench</h3>
                                            <div className="flex gap-1 bg-input border border-border rounded-lg p-1 w-min">
                                                {(['RULES', 'QUERY', 'SETTINGS'] as const).map(tab => (
                                                    <button key={tab} onClick={() => setSiemTab(tab)} className={`px-3 py-1 text-sm font-semibold rounded-md ${siemTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{tab}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {siemTab === 'SETTINGS' && (
                                            <div className="p-6 space-y-4 max-w-lg">
                                                <p className="text-sm text-muted-foreground">Connect Imperium to your Elastic SIEM instance to analyze security control effectiveness.</p>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground">ELASTIC URL</label>
                                                    <input type="text" value={siemConfigInputs.url} onChange={e => setSiemConfigInputs(p => ({...p, url: e.target.value}))} placeholder="https://my-elastic.example.com:9200" className={baseInputStyles} />
                                                </div>
                                                 <div>
                                                    <label className="text-xs font-bold text-muted-foreground">API KEY</label>
                                                    <input type="password" value={siemConfigInputs.apiKey} onChange={e => setSiemConfigInputs(p => ({...p, apiKey: e.target.value}))} placeholder="Paste your Elastic API Key" className={baseInputStyles} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-full ${siemConfig.connected ? 'bg-accent-green animate-pulse' : 'bg-destructive'}`}></span>
                                                        <span className="text-sm font-semibold">{siemConfig.connected ? 'Connected' : 'Not Connected'}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSaveSiemConfig} className={`${secondaryButtonStyles} w-auto`}>Save</button>
                                                        <button onClick={handleTestSiemConnection} className={`${primaryButtonStyles} w-auto`}>Test Connection</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {siemTab === 'QUERY' && (
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <div className="p-4 border-b border-border">
                                                    <form onSubmit={handleSiemQuery} className="flex gap-2">
                                                        <input type="text" value={siemQuery} onChange={e => setSiemQuery(e.target.value)} placeholder="Enter KQL query..." className={baseInputStyles} />
                                                        <button type="submit" className={`${primaryButtonStyles} w-auto`}><SearchIcon className="w-4 h-4 mr-2" />Query</button>
                                                    </form>
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    {isEditorReady ? <CodeEditor value={JSON.stringify(siemQueryResults, null, 2)} onChange={()=>{}} onFileDrop={()=>{}} language="json" readOnly /> : <Loader message="Loading Viewer..." />}
                                                </div>
                                            </div>
                                        )}
                                        {siemTab === 'RULES' && (
                                            <div className="flex-1 overflow-y-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="p-3">Status</th><th className="p-3">Rule Name</th><th className="p-3">Severity</th><th className="p-3">Risk</th><th className="p-3">Actions</th></tr></thead>
                                                    <tbody>
                                                        {siemRules.length > 0 ? siemRules.map(rule => (
                                                            <tr key={rule.id} className="border-b border-border hover:bg-accent/50">
                                                                <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{rule.enabled ? 'ENABLED' : 'DISABLED'}</span></td>
                                                                <td className="p-3 font-semibold">{rule.name}</td>
                                                                <td className="p-3 font-mono">{rule.severity}</td>
                                                                <td className="p-3 font-mono">{rule.risk_score}</td>
                                                                <td className="p-3">
                                                                    <button onClick={() => handleToggleSiemRule(rule.id)} className={`${secondaryButtonStyles} px-3 py-1 text-xs`}>{rule.enabled ? 'Disable' : 'Enable'}</button>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No detection rules found.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {defendTab === 'VALIDATION' && (
                                     <div className="flex flex-col h-full">
                                        <div className="p-4 border-b border-border">
                                            <h3 className="text-lg font-bold text-primary mb-2">Control Validation Planning</h3>
                                            <form onSubmit={e => { e.preventDefault(); handleGenerateValidationPlan(); }} className="flex gap-2">
                                                <input type="text" value={validationObjective} onChange={e => setValidationObjective(e.target.value)} placeholder="What controls are you trying to validate? e.g., Test our EDR's ability to detect credential dumping" className={baseInputStyles} />
                                                <button type="submit" className={`${primaryButtonStyles} w-auto`}>Generate Plan</button>
                                            </form>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            {parsedValidationPlan ? (
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="font-bold text-accent-green">Overview</h4>
                                                        <p className="text-sm mt-1">{parsedValidationPlan.overview}</p>
                                                    </div>
                                                    {parsedValidationPlan.phases.map((phase, phaseIndex) => (
                                                        <div key={phaseIndex}>
                                                            <h4 className="font-bold text-lg text-primary border-b border-border pb-1 mb-3">{phase.title}</h4>
                                                            <div className="space-y-4">
                                                                {phase.steps.map((step, stepIndex) => (
                                                                    <div key={stepIndex} className="bg-input border border-border p-4 rounded-lg">
                                                                        <p className="font-bold">{stepIndex + 1}. {step.action}</p>
                                                                        <div className="flex items-center gap-4 text-xs mt-2 text-muted-foreground">
                                                                            <span><strong>Type:</strong> {step.attackType}</span>
                                                                            <span><strong>Lang:</strong> {step.language}</span>
                                                                            <span><strong>OS:</strong> {step.targetOS}</span>
                                                                        </div>
                                                                        <button onClick={() => handleWeaponizeValidationStep(step)} className="mt-3 text-sm bg-primary/20 text-primary font-bold py-1 px-3 rounded-md hover:bg-primary/40 transition-all">
                                                                            Weaponize This Step
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <MarkdownRenderer content={validationPlan || "Describe the security controls you want to validate to generate an emulation plan."} />
                                            )}
                                        </div>
                                     </div>
                                )}
                                {defendTab === 'DETECTIQ' && (
                                    <div className="flex flex-col h-full">
                                        <div className="p-4 border-b border-border">
                                            <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2"><BrainCircuitIcon/> DetectIQ: Threat Detection Engineering</h3>
                                            <div className="flex gap-1 bg-input border border-border rounded-lg p-1 w-min">
                                                {(['GENERATE', 'OPTIMIZE', 'EXPLAIN'] as DetectIQTab[]).map(tab => (
                                                    <button key={tab} onClick={() => setDetectiqActiveTab(tab)} className={`px-3 py-1 text-sm font-semibold rounded-md ${detectiqActiveTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{tab}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex overflow-hidden">
                                            <div className="w-1/2 p-4 border-r border-border flex flex-col gap-4">
                                                {detectiqActiveTab === 'GENERATE' && (
                                                    <>
                                                        <textarea value={detectiqGenerateInput.inputText} onChange={e => setDetectiqGenerateInput(p => ({...p, inputText: e.target.value}))} placeholder="Describe a threat, paste threat intelligence, or list IoCs..." className={`${baseInputStyles} flex-1 min-h-[100px]`}></textarea>
                                                        <div className="grid grid-cols-2 gap-2">
                                                             <div><label className="text-xs font-bold text-muted-foreground">RULE TYPE</label><div className="relative"><select value={detectiqGenerateInput.ruleType} onChange={e => setDetectiqGenerateInput(p => ({...p, ruleType: e.target.value as any}))} className={baseSelectStyles}><option>Sigma</option><option>YARA</option><option>Snort</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>
                                                             {detectiqGenerateInput.ruleType === 'Sigma' && <div><label className="text-xs font-bold text-muted-foreground">SIEM TARGET</label><div className="relative"><select value={detectiqGenerateInput.siemTarget} onChange={e => setDetectiqGenerateInput(p => ({...p, siemTarget: e.target.value as any}))} className={baseSelectStyles}><option value="">None</option><option>Splunk</option><option>Elastic</option><option>MicrosoftXDR</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/></div></div>}
                                                        </div>
                                                        <button onClick={() => handleDetectIQAction('generate')} className={primaryButtonStyles}><SparklesIcon className="w-4 h-4 mr-2"/> Generate Rule</button>
                                                    </>
                                                )}
                                                {detectiqActiveTab === 'OPTIMIZE' && (
                                                    <>
                                                        <textarea value={detectiqOptimizeInput} onChange={e => setDetectiqOptimizeInput(e.target.value)} placeholder="Paste your existing Sigma, YARA, or Snort rule here..." className={`${baseInputStyles} flex-1`}></textarea>
                                                        <button onClick={() => handleDetectIQAction('optimize')} className={primaryButtonStyles}><ZapIcon className="w-4 h-4 mr-2"/> Optimize Rule</button>
                                                    </>
                                                )}
                                                {detectiqActiveTab === 'EXPLAIN' && (
                                                    <>
                                                        <textarea value={detectiqExplainInput} onChange={e => setDetectiqExplainInput(e.target.value)} placeholder="Paste a Sigma, YARA, or Snort rule to get a natural language explanation." className={`${baseInputStyles} flex-1`}></textarea>
                                                        <button onClick={() => handleDetectIQAction('explain')} className={primaryButtonStyles}><BookTextIcon className="w-4 h-4 mr-2"/> Explain Rule</button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="w-1/2 p-0 flex flex-col overflow-y-auto">
                                                {detectiqOutput ? (
                                                     <div className="flex-1 flex flex-col">
                                                        {(detectiqOutput.rule || detectiqOutput.optimizedRule) && (
                                                            <div className="h-1/2 flex flex-col border-b border-border">
                                                                <h4 className="font-bold text-sm p-2 bg-input">Generated Rule</h4>
                                                                <div className="flex-1 overflow-hidden">
                                                                    {isEditorReady ? <CodeEditor value={detectiqOutput.rule || detectiqOutput.optimizedRule || ''} onChange={()=>{}} onFileDrop={()=>{}} language={MONACO_LANGUAGE_MAP[detectiqGenerateInput.ruleType] || 'plaintext'} readOnly /> : <Loader message="Loading Editor..." />}
                                                                </div>
                                                            </div>
                                                        )}
                                                         {detectiqOutput.siemQuery && (
                                                            <div className="h-1/2 flex flex-col border-b border-border">
                                                                <h4 className="font-bold text-sm p-2 bg-input">SIEM Query ({detectiqGenerateInput.siemTarget})</h4>
                                                                <div className="flex-1 overflow-hidden">
                                                                    {isEditorReady ? <CodeEditor value={detectiqOutput.siemQuery} onChange={()=>{}} onFileDrop={()=>{}} language={'kql'} readOnly /> : <Loader message="Loading Editor..." />}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 overflow-y-auto">
                                                            <h4 className="font-bold text-sm p-2 bg-input sticky top-0">Explanation</h4>
                                                            <MarkdownRenderer content={detectiqOutput.explanation || ''} />
                                                        </div>
                                                        <div className="p-3 bg-destructive/20 text-destructive-foreground text-xs mt-auto">
                                                            <strong>Disclaimer:</strong> This rule was generated by DetectIQ, which is a Proof of Concept. It should be thoroughly tested and validated before being deployed into a production environment.
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        Your output will appear here.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                 {defendTab === 'IR_ASSIST' && (
                                     <div className="flex flex-col h-full">
                                        <div className="p-4 border-b border-border">
                                            <h3 className="text-lg font-bold text-primary mb-2">IR Assist: Elastic Investigation Planner</h3>
                                            <form onSubmit={e => { e.preventDefault(); handleGenerateIrPlan(); }} className="flex gap-2">
                                                <input type="text" value={irObjective} onChange={e => setIrObjective(e.target.value)} placeholder="Describe the incident... e.g., Suspicious logon from a new country" className={baseInputStyles} />
                                                <button type="submit" className={`${primaryButtonStyles} w-auto`}>Generate Plan</button>
                                            </form>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                             {parsedIrPlan ? (
                                                <div className="space-y-8">
                                                    {parsedIrPlan.phases.map((phase, phaseIndex) => (
                                                        <div key={phaseIndex} className="bg-input/50 border border-border rounded-xl p-6">
                                                            <h3 className="text-xl font-bold text-primary mb-4">{phase.title}</h3>
                                                            <div className="space-y-4">
                                                                {phase.steps.map((step, stepIndex) => (
                                                                    <div key={stepIndex} className="bg-background/50 border border-border/70 rounded-lg p-4">
                                                                        <p className="font-semibold text-foreground mb-2">{step.action}</p>
                                                                        <div className="bg-black/50 rounded-md overflow-hidden border border-border">
                                                                            <div className="p-2 bg-border/50 text-xs font-semibold text-muted-foreground flex justify-between items-center">
                                                                                <span>Kibana Query Language (KQL)</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button onClick={() => handleCopyToClipboard(step.query, 'KQL Query')} className="flex items-center gap-1.5 text-xs bg-primary/20 text-primary font-bold py-1 px-2 rounded-md hover:bg-primary/40 transition-all">
                                                                                        <ClipboardListIcon className="w-3 h-3" />
                                                                                        Copy
                                                                                    </button>
                                                                                    <button onClick={() => handleInitiateSiemSubmit(step.query)} className="flex items-center gap-1.5 text-xs bg-accent-orange/20 text-accent-orange font-bold py-1 px-2 rounded-md hover:bg-accent-orange/40 transition-all">
                                                                                        <ZapIcon className="w-3 h-3" />
                                                                                        Submit to Stack
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <pre className="p-3 text-sm whitespace-pre-wrap font-mono">{step.query}</pre>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <MarkdownRenderer content={irPlan || "Describe an incident or threat to generate a step-by-step investigation plan for the ELK stack."} />
                                            )}
                                        </div>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeView === 'EVENT_LOG' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><BookTextIcon/> Event Log</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="p-3">Timestamp</th><th className="p-3">Operator</th><th className="p-3">Action</th><th className="p-3">Details</th></tr></thead>
                                <tbody>
                                    {eventLog.map(e => (
                                        <tr key={e.id} className="border-b border-border hover:bg-accent/50">
                                            <td className="p-3 font-mono whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                                            <td className="p-3 font-mono">{e.operator}</td>
                                            <td className="p-3 font-mono">{e.action}</td>
                                            <td className="p-3 font-mono">{e.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                 {activeView === 'REPORTING' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><ClipboardListIcon/> Reporting</h2>
                             <button onClick={handleGenerateReport} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-2 px-3 rounded-md hover:bg-opacity-80 transition-all duration-300"><SparklesIcon className="w-4 h-4" /> Generate Report</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                           <MarkdownRenderer content={generatedReport || "Click 'Generate Report' to create a summary of the current operation."} />
                        </div>
                    </div>
                )}
                 {activeView === 'SETTINGS' && (
                    <div className="bg-black/30 border border-border rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><SettingsIcon/> Settings</h2>
                        </div>
                         <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/4 border-r border-border p-2">
                                 {(['PROFILE', 'LLM_CONFIG', 'USER_MANAGEMENT', 'PLATFORM', 'MCP_CONFIG'] as SettingsTab[]).map(tab => {
                                    if(tab === 'USER_MANAGEMENT' && !currentUser.permissions.userManagementAccess) return null;
                                    if((tab === 'PLATFORM' || tab === 'MCP_CONFIG') && currentUser.role !== UserRole.SUPER_ADMIN) return null;
                                    return <button key={tab} onClick={() => setSettingsTab(tab)} className={`w-full text-left p-3 rounded-md font-semibold ${settingsTab === tab ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}>{tab.replace('_', ' ')}</button>
                                 })}
                            </div>
                            <div className="w-3/4 p-6 overflow-y-auto">
                                {settingsTab === 'PROFILE' && (
                                    <div className="max-w-xl space-y-6">
                                        <h3 className="text-lg font-bold text-primary border-b border-border pb-2">My Profile</h3>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">USERNAME</label>
                                            <input type="text" value={currentUser.name} onChange={e => setCurrentUser(p => ({...p, name: e.target.value}))} className={baseInputStyles} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">ROLE</label>
                                            <input type="text" value={currentUser.role} disabled className={`${baseInputStyles} opacity-50 cursor-not-allowed`} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">USER ID</label>
                                            <input type="text" value={currentUser.id} disabled className={`${baseInputStyles} opacity-50 cursor-not-allowed font-mono`} />
                                        </div>
                                        <button onClick={handleUpdateProfile} className={primaryButtonStyles}>Update Profile</button>
                                    </div>
                                )}

                                {settingsTab === 'LLM_CONFIG' && (
                                    <div className="max-w-2xl space-y-8">
                                        <div>
                                            <h3 className="text-lg font-bold text-primary border-b border-border pb-2 mb-4">Default LLM Configuration</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground">PROVIDER</label>
                                                    <div className="relative">
                                                        <select value={currentUser.platformLLMConfig.provider} onChange={e => setCurrentUser(p => ({...p, platformLLMConfig: {...p.platformLLMConfig, provider: e.target.value as LLMProvider}}))} className={baseSelectStyles}>
                                                            {Object.values(LLMProvider).map(p => <option key={p}>{p}</option>)}
                                                        </select>
                                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground">MODEL</label>
                                                    <div className="relative">
                                                        <select value={currentUser.platformLLMConfig.model} onChange={e => setCurrentUser(p => ({...p, platformLLMConfig: {...p.platformLLMConfig, model: e.target.value}}))} className={baseSelectStyles}>
                                                            {AVAILABLE_MODELS[currentUser.platformLLMConfig.provider].map(m => <option key={m}>{m}</option>)}
                                                        </select>
                                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"/>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-primary border-b border-border pb-2 mb-4">Granular Control (Advanced)</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Override the default model for specific attack types.</p>
                                            <div className="space-y-3">
                                                {Object.values(AttackType).map(type => (
                                                    <div key={type} className="flex items-center gap-4 p-3 bg-input border border-border rounded-md">
                                                        <span className="text-sm font-semibold flex-1">{type}</span>
                                                        <div className="relative w-48">
                                                            <select 
                                                                value={currentUser.granularLLMConfig[type]?.model || ''} 
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setCurrentUser(p => {
                                                                        const newConfig = {...p.granularLLMConfig};
                                                                        if (val === '') {
                                                                            delete newConfig[type];
                                                                        } else {
                                                                            newConfig[type] = { provider: LLMProvider.GOOGLE, model: val };
                                                                        }
                                                                        return {...p, granularLLMConfig: newConfig};
                                                                    })
                                                                }} 
                                                                className={`${baseSelectStyles} py-1 text-xs`}
                                                            >
                                                                <option value="">Default</option>
                                                                {AVAILABLE_MODELS[LLMProvider.GOOGLE].map(m => <option key={m} value={m}>{m}</option>)}
                                                            </select>
                                                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"/>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'USER_MANAGEMENT' && currentUser.permissions.userManagementAccess && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-primary">User Management</h3>
                                            <button onClick={() => {
                                                const templateUser: User = {
                                                    id: '',
                                                    name: '',
                                                    role: UserRole.USER,
                                                    platformLLMConfig: { provider: LLMProvider.GOOGLE, model: 'gemini-2.5-flash' },
                                                    granularLLMConfig: {},
                                                    permissions: {
                                                        c2Access: false,
                                                        reconAccess: true,
                                                        attackPlanningAccess: false,
                                                        agentBuilderAccess: false,
                                                        scriptEngineAccess: { enabled: false, allowedAttackTypes: [] },
                                                        userManagementAccess: false,
                                                        settingsAccess: false,
                                                    }
                                                };
                                                setSelectedUserForEditing(templateUser);
                                                setIsUserModalOpen(true);
                                            }} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-2 px-3 rounded-md hover:bg-opacity-80"><PlusIcon className="w-4 h-4" /> Add User</button>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-input border-b border-border">
                                                <tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Permissions</th><th className="p-3">Actions</th></tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id} className="border-b border-border hover:bg-accent/50">
                                                        <td className="p-3 font-semibold">{u.name}</td>
                                                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === UserRole.SUPER_ADMIN ? 'bg-purple-500/20 text-purple-400' : u.role === UserRole.ADMIN ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{u.role}</span></td>
                                                        <td className="p-3 text-xs text-muted-foreground">
                                                            {u.permissions.c2Access && <span className="mr-2">C2</span>}
                                                            {u.permissions.reconAccess && <span className="mr-2">Recon</span>}
                                                            {u.permissions.scriptEngineAccess.enabled && <span className="mr-2">Scripting</span>}
                                                        </td>
                                                        <td className="p-3 flex gap-2">
                                                            <button onClick={() => {setSelectedUserForEditing({...u}); setIsUserModalOpen(true);}} className={`${secondaryButtonStyles} px-2 py-1 text-xs`}>Edit</button>
                                                            {u.id !== currentUser.id && <button onClick={() => handleDeleteUser(u.id)} className={`${dangerButtonStyles} px-2 py-1 text-xs`}>Delete</button>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {settingsTab === 'MCP_CONFIG' && currentUser.role === UserRole.SUPER_ADMIN && (
                                    <div className="max-w-xl space-y-6">
                                        <h3 className="text-lg font-bold text-primary border-b border-border pb-2">MCP Server Configuration</h3>
                                        <p className="text-sm text-muted-foreground">Configure an external Model Context Protocol server for advanced OSINT capabilities.</p>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">COMMAND</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. npx, python3, docker"
                                                value={mcpConfigInputs.command} 
                                                onChange={e => setMcpConfigInputs(p => ({...p, command: e.target.value}))} 
                                                className={baseInputStyles} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">ARGUMENTS (Space separated)</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. -y @modelcontextprotocol/server-sqlite"
                                                value={mcpConfigInputs.args} 
                                                onChange={e => setMcpConfigInputs(p => ({...p, args: e.target.value}))} 
                                                className={baseInputStyles} 
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={mcpConfig.enabled} 
                                                onChange={e => setMcpConfig(p => ({...p, enabled: e.target.checked}))}
                                                className="accent-primary w-4 h-4"
                                            />
                                            <label className="text-sm font-bold">Enable Custom MCP Server</label>
                                        </div>
                                        
                                        <div className="bg-accent/20 p-4 rounded-md border border-accent">
                                            <p className="text-xs font-mono text-accent-foreground">
                                                <strong>Current Configuration:</strong><br/>
                                                {mcpConfig.command} {mcpConfig.args.join(' ')}
                                            </p>
                                        </div>

                                        <button onClick={handleSaveMcpConfig} className={primaryButtonStyles}>Save Configuration</button>
                                    </div>
                                )}

                                {settingsTab === 'PLATFORM' && currentUser.role === UserRole.SUPER_ADMIN && (
                                    <div className="max-w-xl space-y-6">
                                        <h3 className="text-lg font-bold text-primary border-b border-border pb-2">Global Platform Settings</h3>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">SESSION TIMEOUT (MINUTES)</label>
                                            <input type="number" value={platformSettings.sessionTimeoutMinutes} onChange={e => setPlatformSettings(p => ({...p, sessionTimeoutMinutes: parseInt(e.target.value)}))} className={baseInputStyles} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">LOG RETENTION (DAYS)</label>
                                            <input type="number" value={platformSettings.logRetentionDays} onChange={e => setPlatformSettings(p => ({...p, logRetentionDays: parseInt(e.target.value)}))} className={baseInputStyles} />
                                        </div>
                                        
                                        <div className="pt-4 border-t border-border">
                                            <label className="text-xs font-bold text-muted-foreground mb-2 block">DISABLED ATTACK TYPES (GLOBAL)</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.values(AttackType).map(at => (
                                                    <label key={at} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={platformSettings.disabledAttackTypes.includes(at)}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setPlatformSettings(p => ({...p, disabledAttackTypes: [...p.disabledAttackTypes, at]}));
                                                                } else {
                                                                    setPlatformSettings(p => ({...p, disabledAttackTypes: p.disabledAttackTypes.filter(t => t !== at)}));
                                                                }
                                                            }}
                                                            className="accent-destructive"
                                                        />
                                                        <span className={platformSettings.disabledAttackTypes.includes(at) ? 'text-destructive decoration-line-through' : ''}>{at}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleSavePlatformSettings} className={primaryButtonStyles}>Save Global Settings</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            {!isVaultOpen && (
                <button
                    onClick={() => setIsVaultOpen(true)}
                    className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-background border-l border-t border-b border-border p-3 rounded-l-lg shadow-lg hover:bg-accent transition-colors z-40"
                    aria-label="Open Payload Vault"
                    title="Open Payload Vault"
                >
                    <VaultIcon className="w-6 h-6 text-primary" />
                </button>
            )}

            {/* Payload Vault Modal */}
            {isVaultOpen && (
                <div 
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50"
                    onClick={() => setIsVaultOpen(false)}
                >
                    <div 
                        className="absolute top-0 right-0 bg-background border-l border-border w-full max-w-2xl h-full flex flex-col shadow-2xl shadow-primary/20 animate-slide-in-right"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><VaultIcon/> Payload Vault</h2>
                            <button onClick={() => setIsVaultOpen(false)} className="p-1 hover:bg-border rounded-md"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {vault.length > 0 ? vault.map(item => (
                                <div key={item.id} className={`bg-input border border-border p-4 rounded-lg flex items-center gap-4 border-l-4 ${item.team === 'BLUE' ? 'border-primary' : 'border-destructive'}`}>
                                    {item.team === 'BLUE' ? <ShieldIcon className="w-6 h-6 text-primary flex-shrink-0" /> : <SkullIcon className="w-6 h-6 text-destructive flex-shrink-0" />}
                                    <div className="flex-1">
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.params.language} / {item.params.attackType} / {item.params.target.os}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                if (item.team === 'BLUE') {
                                                    setThreatHuntParams({
                                                        objective: item.params.objective,
                                                        language: item.params.language,
                                                        target: item.params.target,
                                                    });
                                                    setThreatHuntCode(item.code);
                                                    setActiveView('DEFEND');
                                                    setDefendTab('THREAT_HUNT');
                                                } else {
                                                    setParams(item.params);
                                                    setGeneratedCode(item.code);
                                                    setActiveView('WEAPONIZATION');
                                                }
                                                setIsVaultOpen(false);
                                            }}
                                            className={`${secondaryButtonStyles} text-xs px-3`}>Load</button>
                                        <button 
                                            onClick={() => setVault(v => v.filter(i => i.id !== item.id))}
                                            className={`${dangerButtonStyles} text-xs px-3`}><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-muted-foreground">The vault is empty. Generate some code and save it!</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}