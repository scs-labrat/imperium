import { PrismaClient } from '@prisma/client';
import { redirectorService } from './redirectorService.js';
import { getIo } from '../socket.js';

const prisma = new PrismaClient();

/**
 * RoutingService - Manages traffic routing through redirector chains
 * Configures multi-hop routes from agents through redirectors to C2
 */

export type ForwardingMethod = 'socat' | 'nginx' | 'haproxy' | 'rinetd';

export interface RouteConfig {
    listenerId: string;
    hops: string[];  // Array of redirector IDs in order
    forwardingMethod: ForwardingMethod;
}

export interface RouteHop {
    redirectorId: string;
    redirectorName: string;
    publicIp: string;
    overlayIp?: string;
    tier: string;
    order: number;
}

export interface FullRoute {
    id: string;
    listenerId: string;
    listenerName: string;
    listenerPort: number;
    hops: RouteHop[];
    forwardingMethod: ForwardingMethod;
    active: boolean;
    createdAt: Date;
}

class RoutingService {
    // =========================================================================
    // ROUTE MANAGEMENT
    // =========================================================================

    /**
     * Create a new traffic route
     */
    async createRoute(config: RouteConfig): Promise<FullRoute> {
        // Validate listener exists
        const listener = await prisma.listener.findUnique({
            where: { id: config.listenerId }
        });

        if (!listener) {
            throw new Error('Listener not found');
        }

        // Validate all redirectors exist
        const redirectors = await prisma.redirector.findMany({
            where: { id: { in: config.hops } }
        });

        if (redirectors.length !== config.hops.length) {
            throw new Error('One or more redirectors not found');
        }

        // Create route
        const route = await prisma.redirectorRoute.create({
            data: {
                listenerId: config.listenerId,
                hops: JSON.stringify(config.hops),
                forwardingMethod: config.forwardingMethod,
                active: true
            }
        });

        // Apply routing configuration to redirectors
        await this.applyRouting(route.id);

        return this.getRouteDetails(route.id);
    }

    /**
     * Update an existing route
     */
    async updateRoute(routeId: string, hops: string[]): Promise<FullRoute> {
        const route = await prisma.redirectorRoute.findUnique({
            where: { id: routeId }
        });

        if (!route) {
            throw new Error('Route not found');
        }

        // Validate redirectors
        const redirectors = await prisma.redirector.findMany({
            where: { id: { in: hops } }
        });

        if (redirectors.length !== hops.length) {
            throw new Error('One or more redirectors not found');
        }

        // Update route
        await prisma.redirectorRoute.update({
            where: { id: routeId },
            data: { hops: JSON.stringify(hops) }
        });

        // Re-apply routing
        await this.applyRouting(routeId);

        return this.getRouteDetails(routeId);
    }

    /**
     * Delete a route
     */
    async deleteRoute(routeId: string): Promise<void> {
        const route = await prisma.redirectorRoute.findUnique({
            where: { id: routeId }
        });

        if (!route) {
            throw new Error('Route not found');
        }

        // Disable forwarding on redirectors (optional cleanup)
        // For now, just delete the route record
        await prisma.redirectorRoute.delete({
            where: { id: routeId }
        });
    }

    /**
     * Toggle route active status
     */
    async toggleRoute(routeId: string): Promise<FullRoute> {
        const route = await prisma.redirectorRoute.findUnique({
            where: { id: routeId }
        });

        if (!route) {
            throw new Error('Route not found');
        }

        await prisma.redirectorRoute.update({
            where: { id: routeId },
            data: { active: !route.active }
        });

        if (!route.active) {
            // Was inactive, now active - apply routing
            await this.applyRouting(routeId);
        }

        return this.getRouteDetails(routeId);
    }

    /**
     * Get full route details
     */
    async getRouteDetails(routeId: string): Promise<FullRoute> {
        const route = await prisma.redirectorRoute.findUnique({
            where: { id: routeId },
            include: { listener: true }
        });

        if (!route) {
            throw new Error('Route not found');
        }

        const hopIds = JSON.parse(route.hops) as string[];
        const redirectors = await prisma.redirector.findMany({
            where: { id: { in: hopIds } }
        });

        // Build hop details in order
        const hops: RouteHop[] = hopIds.map((id, index) => {
            const r = redirectors.find(r => r.id === id)!;
            return {
                redirectorId: r.id,
                redirectorName: r.name,
                publicIp: r.ip,
                overlayIp: r.overlayIp || undefined,
                tier: r.tier,
                order: index
            };
        });

        return {
            id: route.id,
            listenerId: route.listenerId,
            listenerName: route.listener.name,
            listenerPort: route.listener.port,
            hops,
            forwardingMethod: route.forwardingMethod as ForwardingMethod,
            active: route.active,
            createdAt: route.createdAt
        };
    }

    /**
     * List all routes
     */
    async listRoutes(): Promise<FullRoute[]> {
        const routes = await prisma.redirectorRoute.findMany({
            include: { listener: true }
        });

        const fullRoutes: FullRoute[] = [];
        for (const route of routes) {
            try {
                const full = await this.getRouteDetails(route.id);
                fullRoutes.push(full);
            } catch {
                // Skip invalid routes
            }
        }

        return fullRoutes;
    }

    /**
     * Get routes for a specific listener
     */
    async getListenerRoutes(listenerId: string): Promise<FullRoute[]> {
        const routes = await prisma.redirectorRoute.findMany({
            where: { listenerId }
        });

        const fullRoutes: FullRoute[] = [];
        for (const route of routes) {
            const full = await this.getRouteDetails(route.id);
            fullRoutes.push(full);
        }

        return fullRoutes;
    }

    // =========================================================================
    // ROUTING CONFIGURATION
    // =========================================================================

    /**
     * Apply routing configuration to all redirectors in a route
     */
    async applyRouting(routeId: string): Promise<void> {
        const route = await prisma.redirectorRoute.findUnique({
            where: { id: routeId },
            include: { listener: true }
        });

        if (!route || !route.active) {
            return;
        }

        const hopIds = JSON.parse(route.hops) as string[];
        const redirectors = await prisma.redirector.findMany({
            where: { id: { in: hopIds } }
        });

        // Create redirector map for easy lookup
        const redirectorMap = new Map(redirectors.map(r => [r.id, r]));

        // Configure each hop
        for (let i = 0; i < hopIds.length; i++) {
            const redirector = redirectorMap.get(hopIds[i]);
            if (!redirector) continue;

            let targetHost: string;
            let targetPort: number;

            if (i === hopIds.length - 1) {
                // Last hop - forward to C2 server
                targetHost = this.getC2ServerAddress();
                targetPort = route.listener.port;
            } else {
                // Forward to next hop
                const nextRedirector = redirectorMap.get(hopIds[i + 1]);
                if (!nextRedirector) continue;

                // Prefer overlay IP if available
                targetHost = nextRedirector.overlayIp || nextRedirector.ip;
                targetPort = route.listener.port;
            }

            try {
                await redirectorService.configureForwarding(redirector.id, {
                    method: route.forwardingMethod as ForwardingMethod,
                    listenPort: route.listener.port,
                    targetHost,
                    targetPort
                });

                this.emitRoutingStatus(routeId, redirector.id, 'configured');
            } catch (error: any) {
                this.emitRoutingStatus(routeId, redirector.id, 'failed', error.message);
            }
        }
    }

    // =========================================================================
    // CONFIGURATION GENERATION
    // =========================================================================

    /**
     * Generate socat forwarding command/config
     */
    generateSocatConfig(options: {
        listenPort: number;
        targetHost: string;
        targetPort: number;
        protocol?: 'tcp' | 'udp';
    }): string {
        const proto = (options.protocol || 'tcp').toUpperCase();
        return `socat ${proto}-LISTEN:${options.listenPort},fork,reuseaddr ${proto}:${options.targetHost}:${options.targetPort}`;
    }

    /**
     * Generate nginx upstream config
     */
    generateNginxConfig(options: {
        listenPort: number;
        upstreams: Array<{ host: string; port: number; weight?: number }>;
        ssl?: boolean;
    }): string {
        const upstreamBlock = options.upstreams.map((u, i) =>
            `    server ${u.host}:${u.port} weight=${u.weight || 1};`
        ).join('\n');

        return `
upstream backend_${options.listenPort} {
${upstreamBlock}
    keepalive 32;
}

server {
    listen ${options.listenPort}${options.ssl ? ' ssl' : ''};

    location / {
        proxy_pass http://backend_${options.listenPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
    }
}
`;
    }

    /**
     * Generate haproxy backend config
     */
    generateHaproxyConfig(options: {
        listenPort: number;
        backends: Array<{ host: string; port: number; weight?: number }>;
        mode?: 'tcp' | 'http';
    }): string {
        const mode = options.mode || 'tcp';
        const backendServers = options.backends.map((b, i) =>
            `    server srv${i + 1} ${b.host}:${b.port} check weight ${b.weight || 1}`
        ).join('\n');

        return `
frontend ft_${options.listenPort}
    bind *:${options.listenPort}
    mode ${mode}
    default_backend bk_${options.listenPort}

backend bk_${options.listenPort}
    mode ${mode}
    balance roundrobin
${backendServers}
`;
    }

    // =========================================================================
    // ROUTE VISUALIZATION
    // =========================================================================

    /**
     * Get route diagram (ASCII representation)
     */
    async getRouteDiagram(routeId: string): Promise<string> {
        const route = await this.getRouteDetails(routeId);

        let diagram = `
Route: ${route.listenerName} (Port ${route.listenerPort})
Method: ${route.forwardingMethod}
Status: ${route.active ? 'ACTIVE' : 'INACTIVE'}

`;

        diagram += 'Agent --> ';

        for (let i = 0; i < route.hops.length; i++) {
            const hop = route.hops[i];
            const hopInfo = `[${hop.tier}] ${hop.redirectorName}\n        (${hop.publicIp}${hop.overlayIp ? ` / ${hop.overlayIp}` : ''})`;

            if (i === 0) {
                diagram += hopInfo;
            } else {
                diagram += ` --> ${hopInfo}`;
            }
        }

        diagram += ' --> [C2 Server]';

        return diagram;
    }

    /**
     * Get route as flowchart data (for frontend visualization)
     */
    async getRouteFlowchart(routeId: string): Promise<{
        nodes: Array<{ id: string; label: string; type: string; ip?: string }>;
        edges: Array<{ from: string; to: string; label?: string }>;
    }> {
        const route = await this.getRouteDetails(routeId);

        const nodes: Array<{ id: string; label: string; type: string; ip?: string }> = [
            { id: 'agent', label: 'Agent', type: 'agent' }
        ];

        const edges: Array<{ from: string; to: string; label?: string }> = [];

        // Add redirector nodes
        for (let i = 0; i < route.hops.length; i++) {
            const hop = route.hops[i];
            nodes.push({
                id: hop.redirectorId,
                label: hop.redirectorName,
                type: hop.tier.toLowerCase(),
                ip: hop.publicIp
            });

            if (i === 0) {
                edges.push({
                    from: 'agent',
                    to: hop.redirectorId,
                    label: `Port ${route.listenerPort}`
                });
            } else {
                const prevHop = route.hops[i - 1];
                edges.push({
                    from: prevHop.redirectorId,
                    to: hop.redirectorId,
                    label: prevHop.overlayIp ? 'Overlay' : 'Direct'
                });
            }
        }

        // Add C2 node
        nodes.push({ id: 'c2', label: 'C2 Server', type: 'c2' });
        if (route.hops.length > 0) {
            const lastHop = route.hops[route.hops.length - 1];
            edges.push({
                from: lastHop.redirectorId,
                to: 'c2',
                label: lastHop.overlayIp ? 'Overlay' : 'Direct'
            });
        }

        return { nodes, edges };
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    /**
     * Get C2 server address (internal IP or localhost)
     */
    private getC2ServerAddress(): string {
        return process.env.C2_SERVER_ADDRESS || '127.0.0.1';
    }

    /**
     * Emit routing status via Socket.IO
     */
    private emitRoutingStatus(
        routeId: string,
        redirectorId: string,
        status: 'configured' | 'failed',
        error?: string
    ): void {
        try {
            getIo().emit('routing_status', {
                routeId,
                redirectorId,
                status,
                error,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            // Socket.IO not available
        }
    }
}

// Singleton instance
export const routingService = new RoutingService();

// Export class for testing
export { RoutingService };
