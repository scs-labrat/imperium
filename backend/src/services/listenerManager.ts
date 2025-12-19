import * as net from 'net';
import { PrismaClient } from '@prisma/client';
import * as c2Service from './c2Service.js';
import { getIo } from '../socket.js';

const prisma = new PrismaClient();

class ListenerManager {
    private activeServers: Map<string, net.Server> = new Map();

    public async startAll() {
        console.log('Starting all listeners...');
        const listeners = await prisma.listener.findMany({ where: { status: 'active' } });
        for (const listener of listeners) {
            await this.start(listener.id);
        }
    }

    public async start(listenerId: string) {
        // Stop if already running to re-bind
        if (this.activeServers.has(listenerId)) {
            this.stop(listenerId);
        }

        const listener = await prisma.listener.findUnique({ where: { id: listenerId } });
        if (!listener) {
            console.error(`Listener ${listenerId} not found.`);
            return;
        }

        try {
            const server = net.createServer(socket => {
                console.log(`New connection to listener ${listener.name} from ${socket.remoteAddress}:${socket.remotePort}`);
                // In a real scenario, this is where you'd handle agent check-ins,
                // parse agent data, and potentially register a new agent in the DB.
                // For now, we'll just log and close the connection.
                socket.end('Connection received by C2 listener.\n');
            });

            server.on('error', async (err: NodeJS.ErrnoException) => {
                console.error(`Error with listener ${listener.name} on ${listener.host}:${listener.port}:`, err.message);
                if (err.code === 'EADDRINUSE') {
                    console.error(`Port ${listener.port} is already in use.`);
                    // Update listener status in DB to reflect error
                    await prisma.listener.update({
                        where: { id: listener.id },
                        data: { status: 'error' }
                    });
                    getIo().emit('listener_status_change', { id: listener.id, status: 'error' });
                }
                this.activeServers.delete(listener.id); // Remove from active even on error
            });

            await new Promise<void>((resolve, reject) => {
                server.listen(listener.port, listener.host, () => {
                    console.log(`Listener "${listener.name}" started on ${listener.host}:${listener.port}`);
                    this.activeServers.set(listener.id, server);
                    resolve();
                });
                server.once('error', reject); // Catch errors that occur during listen
            });
        } catch (error) {
            console.error(`Failed to start listener ${listener.name} on ${listener.host}:${listener.port}:`, error);
            // Ensure status is updated even if listen() promise rejects
            await prisma.listener.update({
                where: { id: listener.id },
                data: { status: 'error' }
            });
            getIo().emit('listener_status_change', { id: listener.id, status: 'error' });
        }
    }

    public stop(listenerId: string) {
        const server = this.activeServers.get(listenerId);
        if (server) {
            server.close(() => {
                console.log(`Listener ${listenerId} stopped.`);
                this.activeServers.delete(listenerId);
            });
        }
    }

    public async stopAll() {
        console.log('Stopping all active listeners...');
        for (const [listenerId, server] of this.activeServers) {
            await new Promise<void>((resolve) => {
                server.close(() => {
                    console.log(`Listener ${listenerId} stopped.`);
                    this.activeServers.delete(listenerId);
                    resolve();
                });
            });
        }
    }
}

export const listenerManager = new ListenerManager();
