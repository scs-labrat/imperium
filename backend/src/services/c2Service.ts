import { PrismaClient } from '@prisma/client';
import { Listener, Agent, Loot, SiemConfig, SiemRule, Redirector } from '../types/index.js';
import { getIo } from '../socket.js';
import { taskQueueService, CreateTaskInput } from './taskQueueService.js';
import { cryptoService } from './cryptoService.js';
import { elasticsearchService } from './elasticsearchService.js';
import { payloadService, StagerConfig } from './payloadService.js';
import { listenerManager } from './listenerManager.js';

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

/**
 * Simulate a new agent check-in (for testing purposes)
 * Creates both the agent and an AgentSession with a generated session key
 */
export const simulateNewAgent = async (listenerId: string, os: string): Promise<Agent> => {
    const listener = await prisma.listener.findUnique({ where: { id: listenerId } });
    if (!listener) throw new Error('Invalid listener ID');

    const now = new Date();
    const agentId = `a${Date.now()}`;

    // Generate a session key for testing
    const sessionKey = cryptoService.generateSessionKey();

    const newAgent = await prisma.agent.create({
        data: {
            id: agentId,
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

    // Create AgentSession for the simulated agent
    await prisma.agentSession.create({
        data: {
            agentId: newAgent.id,
            sessionKey: sessionKey.toString('base64'),
            lastCheckIn: now,
            checkInCount: 1
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

/**
 * Manual agent check-in (for testing via API)
 * Creates both the agent and an AgentSession with a generated session key
 */
export const checkInAgent = async (listenerId: string, os: string): Promise<Agent> => {
    const listener = await prisma.listener.findUnique({ where: { id: listenerId } });
    if (!listener) throw new Error('Invalid listener ID');

    const now = new Date();
    const agentId = `a${Date.now()}`;

    // Generate a session key
    const sessionKey = cryptoService.generateSessionKey();

    const newAgent = await prisma.agent.create({
        data: {
            id: agentId,
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

    // Create AgentSession
    await prisma.agentSession.create({
        data: {
            agentId: newAgent.id,
            sessionKey: sessionKey.toString('base64'),
            lastCheckIn: now,
            checkInCount: 1
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

/**
 * Queue a shell command for execution on an agent
 * Returns a task object - actual output comes async via Socket.IO
 */
export const executeCommand = async (agentId: string, command: string, userId?: string): Promise<{ taskId: string; status: string; message: string }> => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    // Create task in queue
    const task = await taskQueueService.createTask(agentId, {
        type: 'shell',
        command,
        userId
    });

    return {
        taskId: task.id,
        status: 'queued',
        message: `Command queued for agent ${agent.hostname}. Task ID: ${task.id}. Results will be delivered via Socket.IO when the agent executes the command.`
    };
};

/**
 * Queue a module/task for execution on an agent
 * Returns a task object - actual output comes async via Socket.IO
 */
export const runTask = async (agentId: string, taskType: string, userId?: string): Promise<{ taskId: string; status: string; message: string }> => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    // Map task types to actual commands/modules
    const taskCommands: Record<string, { command: string; args?: Record<string, any> }> = {
        'credential_harvesting': { command: 'mimikatz', args: { action: 'sekurlsa::logonpasswords' } },
        'network_scan': { command: 'arp', args: { flags: '-a' } },
        'system_enum': { command: 'systeminfo', args: {} },
        'privesc_check': { command: 'privesc_check', args: { thorough: true } },
        'file_discovery': { command: 'find_files', args: { patterns: ['*.docx', '*.xlsx', '*.pdf', '*.txt'] } },
        'process_list': { command: 'ps', args: { all: true } },
        'screenshot': { command: 'screenshot', args: {} },
        'keylogger_start': { command: 'keylogger', args: { action: 'start' } },
        'keylogger_stop': { command: 'keylogger', args: { action: 'stop' } }
    };

    const taskConfig = taskCommands[taskType];
    if (!taskConfig) {
        throw new Error(`Unknown task type: ${taskType}. Valid types: ${Object.keys(taskCommands).join(', ')}`);
    }

    // Create task in queue
    const task = await taskQueueService.createTask(agentId, {
        type: 'module',
        command: taskConfig.command,
        arguments: taskConfig.args,
        userId
    });

    return {
        taskId: task.id,
        status: 'queued',
        message: `Task '${taskType}' queued for agent ${agent.hostname}. Task ID: ${task.id}. Results will be delivered via Socket.IO when the agent executes the task.`
    };
};

/**
 * Get all tasks for an agent
 */
export const getAgentTasks = async (agentId: string, status?: string) => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const tasks = await taskQueueService.getAgentTasks(agentId, status);
    return tasks.map(t => ({
        ...t,
        arguments: t.arguments ? JSON.parse(t.arguments) : null,
        createdAt: t.createdAt.toISOString(),
        sentAt: t.sentAt?.toISOString() || null,
        completedAt: t.completedAt?.toISOString() || null
    }));
};

/**
 * Get a specific task by ID
 */
export const getTask = async (taskId: string) => {
    const task = await taskQueueService.getTask(taskId);
    if (!task) throw new Error('Task not found');

    return {
        ...task,
        arguments: task.arguments ? JSON.parse(task.arguments) : null,
        createdAt: task.createdAt.toISOString(),
        sentAt: task.sentAt?.toISOString() || null,
        completedAt: task.completedAt?.toISOString() || null
    };
};

/**
 * Get task statistics for an agent
 */
export const getAgentTaskStats = async (agentId: string) => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    return taskQueueService.getAgentTaskStats(agentId);
};

/**
 * Cancel a pending task
 */
export const cancelTask = async (taskId: string) => {
    const cancelled = await taskQueueService.cancelTask(taskId);
    if (!cancelled) throw new Error('Task not found or cannot be cancelled (only pending tasks can be cancelled)');

    return {
        taskId: cancelled.id,
        status: 'cancelled',
        message: 'Task cancelled successfully'
    };
};

/**
 * Retry a failed task
 */
export const retryTask = async (taskId: string) => {
    const newTask = await taskQueueService.retryTask(taskId);
    if (!newTask) throw new Error('Task not found or cannot be retried (only failed tasks can be retried)');

    return {
        taskId: newTask.id,
        originalTaskId: taskId,
        status: 'queued',
        message: 'Task retried successfully - new task created'
    };
};

/**
 * Upload a file to an agent
 */
export const uploadFile = async (agentId: string, filePath: string, content: Buffer, userId?: string) => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const task = await taskQueueService.createTask(agentId, {
        type: 'upload',
        command: filePath,
        arguments: { content: content.toString('base64') },
        userId
    });

    return {
        taskId: task.id,
        status: 'queued',
        message: `File upload queued for ${filePath}`
    };
};

/**
 * Download a file from an agent
 */
export const downloadFile = async (agentId: string, filePath: string, userId?: string) => {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const task = await taskQueueService.createTask(agentId, {
        type: 'download',
        command: filePath,
        userId
    });

    return {
        taskId: task.id,
        status: 'queued',
        message: `File download queued for ${filePath}`
    };
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

/**
 * Test connection to Elasticsearch SIEM
 * Actually connects to Elasticsearch and validates credentials
 */
export const testSiemConnection = async (config: SiemConfig): Promise<{ success: boolean; message: string; clusterInfo?: any }> => {
    if (!config.url || !config.apiKey) {
        return { success: false, message: 'URL and API Key are required' };
    }

    // Attempt real connection to Elasticsearch
    const result = await elasticsearchService.connect({
        url: config.url,
        apiKey: config.apiKey,
        verifyTls: config.verifyTls,
        cloudId: config.cloudId || undefined,
        indexPattern: config.indexPattern || 'logs-*'
    });

    // If successful, update the database with connected status
    if (result.success) {
        await prisma.siemConfig.upsert({
            where: { id: 'default' },
            update: { connected: true },
            create: { id: 'default', url: config.url, apiKey: config.apiKey, connected: true }
        });
    }

    return result;
};

/**
 * Query SIEM using KQL (Kibana Query Language)
 * Executes real Elasticsearch query
 */
export const querySiem = async (kqlQuery: string, options?: {
    index?: string;
    size?: number;
    from?: number;
    timeRange?: { gte: string; lte: string };
}): Promise<any[]> => {
    // Check if connected
    if (!elasticsearchService.isConnected()) {
        // Try to initialize from database config
        const initResult = await elasticsearchService.initFromDatabase();
        if (!initResult.success) {
            throw new Error(initResult.message);
        }
    }

    // Execute the query
    const result = await elasticsearchService.queryKql(kqlQuery, {
        index: options?.index,
        size: options?.size || 100,
        from: options?.from || 0,
        timeRange: options?.timeRange
    });

    // Return just the source documents for backward compatibility
    return result.hits.map(hit => hit._source);
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

/**
 * Submit a raw Elasticsearch DSL query
 * Executes real Elasticsearch DSL query
 */
export const submitDslQuery = async (dslQuery: string, options?: {
    index?: string;
}): Promise<any> => {
    // Check if connected
    if (!elasticsearchService.isConnected()) {
        // Try to initialize from database config
        const initResult = await elasticsearchService.initFromDatabase();
        if (!initResult.success) {
            throw new Error(initResult.message);
        }
    }

    // Execute the DSL query
    const result = await elasticsearchService.queryDsl(dslQuery, {
        index: options?.index
    });

    // Return full Elasticsearch response format for DSL queries
    return {
        took: result.took,
        timed_out: result.timedOut,
        hits: {
            total: { value: result.total, relation: 'eq' },
            hits: result.hits
        }
    };
};

// --- Payload Generation ---
/**
 * Generate a stager payload
 */
export const generatePayload = async (config: StagerConfig) => {
    return payloadService.generateStager(config);
};

/**
 * Get available payload formats
 */
export const getPayloadFormats = () => {
    return payloadService.getAvailableFormats();
};
