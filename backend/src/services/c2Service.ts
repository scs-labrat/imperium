import { PrismaClient } from '@prisma/client';
import { Listener, Agent, Loot, SiemConfig, SiemRule, Redirector } from '../types/index.js';
import { getIo } from '../socket.js';

const prisma = new PrismaClient();

// --- Helper Functions ---
const generateRandomIp = () => `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
const generateHostname = (os: string) => os === 'windows' ? `DESKTOP-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : `server-${Math.random().toString(36).substring(2, 6)}`;
const generateUser = (os: string) => os === 'windows' ? 'SYSTEM' : 'root';

// --- Seeding Data (if DB is empty) ---
const seedData = async () => {
    try {
        const redirectorCount = await prisma.redirector.count();
        if (redirectorCount === 0) {
            await prisma.redirector.createMany({
                data: [
                    { id: 'r1', name: 'edge-http-01', ip: '1.1.1.1', type: 'HTTP/S', tier: 'Edge', status: 'Healthy' },
                    { id: 'r2', name: 'internal-dns-01', ip: '10.10.0.5', type: 'DNS', tier: 'Internal', status: 'Healthy' },
                    { id: 'r3', name: 'edge-smb-01', ip: '2.2.2.2', type: 'SMB', tier: 'Edge', status: 'Degraded' },
                ]
            });
            console.log('Seeded Redirectors');
        }

        const listenerCount = await prisma.listener.count();
        if (listenerCount === 0) {
            await prisma.listener.createMany({
                data: [
                    { id: 'l1', name: 'HTTP-80', type: 'HTTP', host: '0.0.0.0', port: 80, status: 'active', redirectorId: 'r1', hostHeader: 'www.google.com' },
                    { id: 'l2', name: 'HTTPS-443', type: 'HTTPS', host: '0.0.0.0', port: 443, status: 'inactive' },
                    { id: 'l3', name: 'SMB-Pipe', type: 'SMB', host: 'imperium.c2', port: 445, status: 'active', redirectorId: 'r3' },
                ]
            });
            console.log('Seeded Listeners');
        }
        
        const agentCount = await prisma.agent.count();
        if (agentCount === 0) {
            const now = new Date();
            await prisma.agent.createMany({
                data: [
                    {
                        id: 'a1', os: 'windows', osVersion: 'Windows 10 Pro', hostname: 'DESKTOP-R7T5J6B', user: 'john.doe',
                        privileges: 'Admin', ip: '192.168.1.101', externalIp: '8.8.8.8', lastSeen: new Date(now.getTime() - 5000),
                        firstSeen: new Date(now.getTime() - 3600000), status: 'active', listener: 'HTTP-80',
                        pid: 1234, processName: 'svchost.exe', processInjectionTarget: 'explorer.exe'
                    },
                    {
                        id: 'a2', os: 'linux', osVersion: 'Ubuntu 22.04', hostname: 'web-server-01', user: 'www-data',
                        privileges: 'User', ip: '10.0.2.15', externalIp: '8.8.4.4', lastSeen: new Date(now.getTime() - 120000),
                        firstSeen: new Date(now.getTime() - 7200000), status: 'stale', listener: 'HTTPS-443',
                        pid: 5678, processName: '/usr/sbin/apache2'
                    }
                ]
            });
            console.log('Seeded Agents');
        }

        const ruleCount = await prisma.siemRule.count();
        if (ruleCount === 0) {
            await prisma.siemRule.createMany({
                data: [
                    { id: 'rule-1', name: 'Suspicious PowerShell Download', description: 'Detects PowerShell using WebClient to download files.', query: 'process.name:powershell.exe AND process.command_line: *WebClient* AND process.command_line: *DownloadFile*', severity: 'high', risk_score: 75, enabled: true },
                    { id: 'rule-2', name: 'Potential Credential Dumping via LSASS Access', description: 'Identifies processes accessing LSASS memory, which may indicate credential dumping.', query: 'process.name:lsass.exe AND event.action:process_accessed', severity: 'critical', risk_score: 90, enabled: true },
                    { id: 'rule-3', name: 'Scheduled Task Creation for Persistence', description: 'Monitors for the creation of scheduled tasks, a common persistence technique.', query: 'process.name:schtasks.exe AND process.command_line: * /create *', severity: 'medium', risk_score: 50, enabled: false },
                    { id: 'rule-4', name: 'Unsigned DLL Loaded by Rundll32', description: 'Detects rundll32.exe loading an unsigned DLL.', query: 'process.name:rundll32.exe AND NOT dll.signed:true', severity: 'high', risk_score: 65, enabled: true },
                ]
            });
            console.log('Seeded SIEM Rules');
        }
    } catch (e) {
        console.error("Seeding failed:", e);
    }
};

// Seed on module load (in a real app, do this in a dedicated script)
seedData().catch(console.error);

// --- Mock SIEM Data (kept in-memory for now as it's read-only mock) ---
const mockSiemLogs = [
    { '@timestamp': new Date(Date.now() - 10000).toISOString(), 'process.name': 'powershell.exe', 'process.command_line': 'powershell -ExecutionPolicy Bypass -File C:\Users\john.doe\Desktop\Invoke-Mimikatz.ps1', 'event.action': 'process_started', 'user.name': 'john.doe' },
    { '@timestamp': new Date(Date.now() - 9000).toISOString(), 'process.name': 'lsass.exe', 'event.action': 'process_accessed', 'source.ip': '192.168.1.101', 'destination.ip': '192.168.1.101', 'user.name': 'john.doe', 'process.parent.name': 'powershell.exe' },
    { '@timestamp': new Date(Date.now() - 8000).toISOString(), 'process.name': 'rundll32.exe', 'process.command_line': 'rundll32.exe C:\Users\john.doe\AppData\Local\Temp\malicious.dll,EntryPoint', 'event.action': 'process_started', 'user.name': 'john.doe' },
    { '@timestamp': new Date(Date.now() - 7000).toISOString(), 'file.path': 'C:\Users\john.doe\Documents\secret.docx', 'event.action': 'file_access', 'process.name': 'rundll32.exe' },
    { '@timestamp': new Date(Date.now() - 6000).toISOString(), 'network.direction': 'egress', 'destination.ip': '45.33.32.156', 'destination.port': 80, 'process.name': 'rundll32.exe', 'network.protocol': 'http' },
    { '@timestamp': new Date(Date.now() - 5000).toISOString(), 'process.name': 'schtasks.exe', 'process.command_line': '/create /sc minute /mo 1 /tn "Updater" /tr C:\Users\Public\beacon.exe', 'event.action': 'process_started', 'user.name': 'SYSTEM' },
];

const mockSiemResponse = {
    "took": 15,
    "timed_out": false,
    "_shards": { "total": 5, "successful": 5, "skipped": 0, "failed": 0 },
    "hits": {
        "total": { "value": 2, "relation": "eq" },
        "max_score": 1.0,
        "hits": [
             { "_index": "logs-generic", "_id": "1", "_score": 1.0, "_source": { "@timestamp": new Date().toISOString(), "process": { "name": "powershell.exe" }, "event": { "category": "network_traffic" } } }
        ]
    }
};

// --- Listener Management ---
export const getListeners = async (): Promise<Listener[]> => {
    const listeners = await prisma.listener.findMany();
    console.log('Listeners fetched from DB:', listeners);
    return listeners.map(l => ({
        ...l,
        redirectorId: l.redirectorId ?? undefined,
        hostHeader: l.hostHeader ?? undefined
    })) as Listener[];
};

export const createListener = async (newListenerData: Omit<Listener, 'id' | 'status'>): Promise<Listener> => {
    const newListener = await prisma.listener.create({
        data: {
            id: `l${Date.now()}`,
            ...newListenerData,
            status: 'inactive'
        }
    });
    return {
        ...newListener,
        redirectorId: newListener.redirectorId ?? undefined,
        hostHeader: newListener.hostHeader ?? undefined
    } as Listener;
};

export const deleteListener = async (id: string): Promise<void> => {
    await prisma.listener.delete({ where: { id } });
};

export const toggleListenerStatus = async (id: string, status: 'active' | 'inactive'): Promise<Listener> => {
    const listener = await prisma.listener.update({
        where: { id },
        data: { status }
    });

    if (status === 'active') {
        listenerManager.start(listener.id);
    } else {
        listenerManager.stop(listener.id);
    }

    return {
        ...listener,
        redirectorId: listener.redirectorId ?? undefined,
        hostHeader: listener.hostHeader ?? undefined
    } as Listener;
};

// --- Redirector Management ---
export const getRedirectors = async (): Promise<Redirector[]> => {
    const redirectors = await prisma.redirector.findMany();
    return redirectors as unknown as Redirector[];
};

export const createRedirector = async (newRedirectorData: Omit<Redirector, 'id' | 'status'>): Promise<Redirector> => {
    const newRedirector = await prisma.redirector.create({
        data: {
            id: `r${Date.now()}`,
            ...newRedirectorData,
            status: 'Healthy'
        }
    });
    return newRedirector as unknown as Redirector;
};

export const deleteRedirector = async (id: string): Promise<void> => {
    await prisma.redirector.delete({ where: { id } });
    await prisma.listener.updateMany({
        where: { redirectorId: id },
        data: { redirectorId: null }
    });
};

// --- Agent Management ---
export const getAgents = async (): Promise<Agent[]> => {
    const agents = await prisma.agent.findMany();
    
    const now = Date.now();
    const updatedAgents = await Promise.all(agents.map(async (agent) => {
        const timeSinceSeen = now - new Date(agent.lastSeen).getTime();
        let newStatus = agent.status;
        
        if (timeSinceSeen > 86400000) newStatus = 'lost';
        else if (timeSinceSeen > 300000) newStatus = 'dead';
        else if (timeSinceSeen > 60000) newStatus = 'stale';
        else newStatus = 'active';

        if (newStatus !== agent.status) {
            const updated = await prisma.agent.update({
                where: { id: agent.id },
                data: { status: newStatus }
            });
            // Try to emit status change
            try { getIo().emit('agent_status_change', updated); } catch(e) {}
            return updated;
        }
        return agent;
    }));

    return updatedAgents.map(a => ({
        ...a,
        lastSeen: a.lastSeen.toISOString(),
        firstSeen: a.firstSeen.toISOString(),
        processInjectionTarget: a.processInjectionTarget ?? undefined
    })) as unknown as Agent[];
};

export const getAgent = async (id: string): Promise<Agent> => {
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new Error('Agent not found');
    return {
        ...agent,
        lastSeen: agent.lastSeen.toISOString(),
        firstSeen: agent.firstSeen.toISOString(),
        processInjectionTarget: agent.processInjectionTarget ?? undefined
    } as unknown as Agent;
};

export const simulateNewAgent = async (listenerId: string, os: string): Promise<Agent> => {
    const listener = await prisma.listener.findUnique({ where: { id: listenerId } });
    if (!listener) throw new Error('Invalid listener ID');

    const now = new Date();
    const newAgent = await prisma.agent.create({
        data: {
            id: `a${Date.now()}`,
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
        }
    });
    
    // Emit new agent event
    try { getIo().emit('new_agent', newAgent); } catch(e) {}

    return {
        ...newAgent,
        lastSeen: newAgent.lastSeen.toISOString(),
        firstSeen: newAgent.firstSeen.toISOString(),
        processInjectionTarget: newAgent.processInjectionTarget ?? undefined
    } as unknown as Agent;
};

export const checkInAgent = async (listenerId: string, os: string): Promise<Agent> => {
    const listener = await prisma.listener.findUnique({ where: { id: listenerId } });
    if (!listener) throw new Error('Invalid listener ID');

    const now = new Date();
    const newAgent = await prisma.agent.create({
        data: {
            id: `a${Date.now()}`,
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
        }
    });
    
    // Emit new agent event
    try { getIo().emit('new_agent', newAgent); } catch(e) {}

    return {
        ...newAgent,
        lastSeen: newAgent.lastSeen.toISOString(),
        firstSeen: newAgent.firstSeen.toISOString(),
        processInjectionTarget: newAgent.processInjectionTarget ?? undefined
    } as unknown as Agent;
};

export const executeCommand = async (agentId: string, command: string): Promise<string> => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    let output = '';
    if (agent.os === 'windows') {
        if (command.toLowerCase() === 'whoami') output = `${agent.hostname}\${agent.user}`;
        else if (command.toLowerCase().startsWith('dir')) output = `Volume in drive C has no label.\n Directory of C:\Users\${agent.user}`;
        else output = `'${command}' is not recognized.`;
    } else {
        if (command.toLowerCase() === 'whoami') output = agent.user;
        else if (command.toLowerCase() === 'ls') output = 'Documents Downloads';
        else output = `${command}: command not found`;
    }
    return output;
};

export const runTask = async (agentId: string, task: string): Promise<Loot> => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    let lootData: any = {
        id: `loot${Date.now()}`,
        agentId: agent.id,
        timestamp: new Date()
    };

    switch (task) {
        case 'credential_harvesting':
            lootData = { ...lootData, type: 'credential', source: 'mimikatz', content: `SAM Account: ${agent.user} NTLM: 1a2b3c4d...` };
            break;
        case 'network_scan':
            lootData = { ...lootData, type: 'network_data', source: 'arp -a', content: `192.168.1.1 - Gateway` };
            break;
        case 'system_enum':
            lootData = { ...lootData, type: 'system_output', source: 'systeminfo', content: `OS: ${agent.osVersion}` };
            break;
        case 'privesc_check':
            lootData = { ...lootData, type: 'system_output', source: 'privesc_check.sh', content: `[+] Unquoted service paths found...` };
            break;
        default:
            throw new Error('Unknown task');
    }

    const newLoot = await prisma.loot.create({ data: lootData });

    // Emit new loot event
    try { getIo().emit('new_loot', newLoot); } catch(e) {}

    return {
        ...newLoot,
        timestamp: newLoot.timestamp.toISOString(),
        confidence: newLoot.confidence ?? undefined,
        sourcePath: newLoot.sourcePath ?? undefined
    } as unknown as Loot;
};

// --- Loot Management ---
export const getLoot = async (): Promise<Loot[]> => {
    const loot = await prisma.loot.findMany();
    return loot.map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
        confidence: l.confidence ?? undefined,
        sourcePath: l.sourcePath ?? undefined
    })) as unknown as Loot[];
};

// --- SIEM Management ---
export const getSiemConfig = async (): Promise<SiemConfig> => {
    let config = await prisma.siemConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
        config = await prisma.siemConfig.create({
            data: { id: 'default', url: '', apiKey: '', connected: false }
        });
    }
    return config as unknown as SiemConfig;
};

export const saveSiemConfig = async (configData: SiemConfig): Promise<SiemConfig> => {
    const config = await prisma.siemConfig.upsert({
        where: { id: 'default' },
        update: { url: configData.url, apiKey: configData.apiKey, connected: configData.connected },
        create: { id: 'default', url: configData.url, apiKey: configData.apiKey, connected: configData.connected }
    });
    return config as unknown as SiemConfig;
};

export const testSiemConnection = async (config: SiemConfig): Promise<{ success: boolean; message: string }> => {
    if (config.url && config.apiKey && config.url.startsWith('http') && config.apiKey.length > 10) {
        return { success: true, message: 'Successfully connected to Elastic SIEM.' };
    } else {
        return { success: false, message: 'Connection failed. Please check URL and API Key.' };
    }
};

export const querySiem = async (kqlQuery: string): Promise<any[]> => {
    const keywords = (kqlQuery.match(/"(.*?)"/g) || []).map(k => k.replace(/"/g, '').toLowerCase());
    if (keywords.length === 0) keywords.push(...kqlQuery.toLowerCase().split(' '));

    const results = mockSiemLogs.filter(log => {
         const logString = JSON.stringify(log).toLowerCase();
         return keywords.some(keyword => keyword && logString.includes(keyword));
    });
    
    await new Promise(res => setTimeout(res, 1000));
    return results;
};

export const getSiemRules = async (): Promise<SiemRule[]> => {
    const rules = await prisma.siemRule.findMany();
    return rules as unknown as SiemRule[];
};

export const toggleSiemRule = async (ruleId: string): Promise<SiemRule> => {
    const rule = await prisma.siemRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new Error('Rule not found');

    const updatedRule = await prisma.siemRule.update({
        where: { id: ruleId },
        data: { enabled: !rule.enabled }
    });
    return updatedRule as unknown as SiemRule;
};

export const submitDslQuery = async (dslQuery: string): Promise<any> => {
    await new Promise(res => setTimeout(res, 800));
    const config = await getSiemConfig();
    if (!config.connected) {
        return Promise.reject(new Error("SIEM not connected."));
    }
    return Promise.resolve(mockSiemResponse);
};
