import { PrismaClient } from '@prisma/client';
import { getIo } from '../socket.js';
import { createListener, isListenerTypeSupported, IListener, AgentCheckInData } from './listeners/index.js';

const prisma = new PrismaClient();

/**
 * ListenerManager - Manages all C2 listener instances
 * Handles starting, stopping, and event routing for listeners
 */
class ListenerManager {
    private activeListeners: Map<string, IListener> = new Map();

    /**
     * Start all listeners that are marked as active in the database
     */
    public async startAll(): Promise<void> {
        console.log('[ListenerManager] Starting all active listeners...');
        const listeners = await prisma.listener.findMany({ where: { status: 'active' } });

        for (const listener of listeners) {
            try {
                await this.start(listener.id);
            } catch (error) {
                console.error(`[ListenerManager] Failed to start listener ${listener.name}:`, error);
            }
        }
    }

    /**
     * Start a specific listener by ID
     */
    public async start(listenerId: string): Promise<void> {
        // Stop if already running to re-bind
        if (this.activeListeners.has(listenerId)) {
            await this.stop(listenerId);
        }

        const listenerConfig = await prisma.listener.findUnique({ where: { id: listenerId } });
        if (!listenerConfig) {
            console.error(`[ListenerManager] Listener ${listenerId} not found in database`);
            return;
        }

        // Check if listener type is supported
        if (!isListenerTypeSupported(listenerConfig.type)) {
            console.warn(`[ListenerManager] Listener type ${listenerConfig.type} not yet implemented, skipping ${listenerConfig.name}`);
            await prisma.listener.update({
                where: { id: listenerId },
                data: { status: 'error' }
            });
            try {
                getIo().emit('listener_status_change', { id: listenerId, status: 'error', message: `Type ${listenerConfig.type} not supported` });
            } catch (e) {}
            return;
        }

        try {
            // Create listener instance
            const listener = createListener({
                id: listenerConfig.id,
                name: listenerConfig.name,
                type: listenerConfig.type,
                host: listenerConfig.host,
                port: listenerConfig.port,
                hostHeader: listenerConfig.hostHeader || undefined,
                redirectorId: listenerConfig.redirectorId || undefined
            });

            // Wire up event handlers
            this.setupEventHandlers(listener);

            // Start the listener
            await listener.start();

            // Store in active listeners
            this.activeListeners.set(listenerId, listener);

            // Update status in database
            await prisma.listener.update({
                where: { id: listenerId },
                data: { status: 'active' }
            });

            // Emit status change
            try {
                getIo().emit('listener_status_change', { id: listenerId, status: 'active' });
            } catch (e) {}

        } catch (error: any) {
            console.error(`[ListenerManager] Failed to start listener ${listenerConfig.name}:`, error.message);

            // Update status to error
            await prisma.listener.update({
                where: { id: listenerId },
                data: { status: 'error' }
            });

            // Emit error status
            try {
                getIo().emit('listener_status_change', {
                    id: listenerId,
                    status: 'error',
                    message: error.code === 'EADDRINUSE'
                        ? `Port ${listenerConfig.port} is already in use`
                        : error.message
                });
            } catch (e) {}

            throw error;
        }
    }

    /**
     * Stop a specific listener
     */
    public async stop(listenerId: string): Promise<void> {
        const listener = this.activeListeners.get(listenerId);
        if (listener) {
            await listener.stop();
            this.activeListeners.delete(listenerId);
            console.log(`[ListenerManager] Listener ${listenerId} stopped`);
        }
    }

    /**
     * Stop all active listeners
     */
    public async stopAll(): Promise<void> {
        console.log('[ListenerManager] Stopping all active listeners...');
        const promises: Promise<void>[] = [];

        for (const [listenerId, listener] of this.activeListeners) {
            promises.push(
                listener.stop().then(() => {
                    this.activeListeners.delete(listenerId);
                    console.log(`[ListenerManager] Listener ${listenerId} stopped`);
                })
            );
        }

        await Promise.all(promises);
    }

    /**
     * Check if a listener is currently running
     */
    public isRunning(listenerId: string): boolean {
        const listener = this.activeListeners.get(listenerId);
        return listener?.isRunning() ?? false;
    }

    /**
     * Get all active listener IDs
     */
    public getActiveListenerIds(): string[] {
        return Array.from(this.activeListeners.keys());
    }

    /**
     * Setup event handlers for a listener
     */
    private setupEventHandlers(listener: IListener): void {
        // Handle new agent check-ins
        listener.on('agent_checkin', async (data: AgentCheckInData, remoteAddr: string) => {
            console.log(`[ListenerManager] New agent check-in from ${remoteAddr}: ${data.agentId}`);

            // Emit Socket.IO event for real-time UI update
            try {
                const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
                if (agent) {
                    getIo().emit('new_agent', {
                        ...agent,
                        lastSeen: agent.lastSeen.toISOString(),
                        firstSeen: agent.firstSeen.toISOString()
                    });
                }
            } catch (e) {
                console.warn('[ListenerManager] Failed to emit new_agent event:', e);
            }
        });

        // Handle task results
        listener.on('task_result', async (data) => {
            console.log(`[ListenerManager] Task result received: ${data.taskId} - ${data.success ? 'success' : 'failed'}`);

            // Socket.IO event is already emitted by taskQueueService.completeTask()
            // Additional handling can be added here if needed
        });

        // Handle errors
        listener.on('error', (error) => {
            console.error(`[ListenerManager] Listener ${listener.config.name} error:`, error);

            // Try to update status
            prisma.listener.update({
                where: { id: listener.config.id },
                data: { status: 'error' }
            }).catch(() => {});

            try {
                getIo().emit('listener_status_change', {
                    id: listener.config.id,
                    status: 'error',
                    message: error.message
                });
            } catch (e) {}
        });

        // Handle stop events
        listener.on('stopped', () => {
            this.activeListeners.delete(listener.config.id);
        });
    }
}

// Singleton instance
export const listenerManager = new ListenerManager();
