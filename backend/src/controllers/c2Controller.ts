
import { Request, Response } from 'express';
import * as c2Service from '../services/c2Service.js';
import { overlayService } from '../services/overlayService.js';
import { redirectorService } from '../services/redirectorService.js';
import { routingService } from '../services/routingService.js';

export const getListeners = async (req: Request, res: Response) => {
    try {
        const listeners = await c2Service.getListeners();
        res.json(listeners);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching listeners' });
    }
};

export const createListener = async (req: Request, res: Response) => {
    console.log('Creating listener with body:', req.body);
    try {
        const newListener = await c2Service.createListener(req.body);
        res.status(201).json(newListener);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create listener' });
    }
};

export const deleteListener = (req: Request, res: Response) => {
    try {
        c2Service.deleteListener(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ message: 'Listener not found' });
    }
};

export const toggleListenerStatus = (req: Request, res: Response) => {
    try {
        const updatedListener = c2Service.toggleListenerStatus(req.params.id, req.body.status);
        res.json(updatedListener);
    } catch (error) {
        res.status(404).json({ message: 'Listener not found' });
    }
};

// --- Redirector Controllers ---
export const getRedirectors = async (req: Request, res: Response) => {
    try {
        const redirectors = await c2Service.getRedirectors();
        res.json(redirectors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching redirectors' });
    }
};

export const createRedirector = async (req: Request, res: Response) => {
    console.log('Creating redirector with body:', req.body);
    try {
        const newRedirector = await c2Service.createRedirector(req.body);
        res.status(201).json(newRedirector);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create redirector' });
    }
};

export const deleteRedirector = async (req: Request, res: Response) => {
    try {
        await c2Service.deleteRedirector(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting redirector' });
    }
};

export const getAgents = async (req: Request, res: Response) => {
    try {
        const agents = await c2Service.getAgents();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching agents' });
    }
};

export const getAgent = async (req: Request, res: Response) => {
    try {
        const agent = await c2Service.getAgent(req.params.id);
        res.json(agent);
    } catch (error) {
        res.status(404).json({ message: 'Agent not found' });
    }
};

export const executeCommand = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.executeCommand(req.params.id, req.body.command, req.body.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error executing command' });
    }
};

export const runTask = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.runTask(req.params.id, req.body.task, req.body.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error running task' });
    }
};

// --- Task Management Controllers ---
export const getAgentTasks = async (req: Request, res: Response) => {
    try {
        const tasks = await c2Service.getAgentTasks(req.params.id, req.query.status as string | undefined);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching tasks' });
    }
};

export const getTask = async (req: Request, res: Response) => {
    try {
        const task = await c2Service.getTask(req.params.taskId);
        res.json(task);
    } catch (error) {
        res.status(404).json({ message: error instanceof Error ? error.message : 'Task not found' });
    }
};

export const getAgentTaskStats = async (req: Request, res: Response) => {
    try {
        const stats = await c2Service.getAgentTaskStats(req.params.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching task stats' });
    }
};

export const cancelTask = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.cancelTask(req.params.taskId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Error cancelling task' });
    }
};

export const retryTask = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.retryTask(req.params.taskId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Error retrying task' });
    }
};

export const uploadFile = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.uploadFile(
            req.params.id,
            req.body.filePath,
            Buffer.from(req.body.content, 'base64'),
            req.body.userId
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error uploading file' });
    }
};

export const downloadFile = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.downloadFile(req.params.id, req.body.filePath, req.body.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error downloading file' });
    }
};

export const getLoot = async (req: Request, res: Response) => {
    try {
        const loot = await c2Service.getLoot();
        res.json(loot);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching loot' });
    }
};

export const simulateNewAgent = async (req: Request, res: Response) => {
    try {
        const { listenerId, os } = req.body;
        const newAgent = await c2Service.simulateNewAgent(listenerId, os);
        res.status(201).json(newAgent);
    } catch (error) {
        res.status(500).json({ message: 'Error simulating new agent' });
    }
};

export const checkInAgent = async (req: Request, res: Response) => {
    try {
        const { listenerId, os } = req.body;
        const newAgent = await c2Service.checkInAgent(listenerId, os);
        res.status(201).json(newAgent);
    } catch (error) {
        res.status(500).json({ message: 'Error checking in agent' });
    }
};

export const getSiemConfig = async (req: Request, res: Response) => {
    try {
        const config = await c2Service.getSiemConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SIEM config' });
    }
};

export const saveSiemConfig = async (req: Request, res: Response) => {
    try {
        const config = await c2Service.saveSiemConfig(req.body);
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error saving SIEM config' });
    }
};

export const testSiemConnection = async (req: Request, res: Response) => {
    try {
        const result = await c2Service.testSiemConnection(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error testing SIEM connection' });
    }
};

export const querySiem = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        const results = await c2Service.querySiem(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error querying SIEM' });
    }
};

export const getSiemRules = async (req: Request, res: Response) => {
    try {
        const rules = await c2Service.getSiemRules();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SIEM rules' });
    }
};

export const toggleSiemRule = async (req: Request, res: Response) => {
    try {
        const rule = await c2Service.toggleSiemRule(req.params.id);
        res.json(rule);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling SIEM rule' });
    }
};

export const submitDslQuery = async (req: Request, res: Response) => {
    try {
        const { dslQuery } = req.body;
        const result = await c2Service.submitDslQuery(dslQuery);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error submitting DSL query' });
    }
};

// --- Payload Generation Controllers ---
export const generatePayload = async (req: Request, res: Response) => {
    try {
        const payload = await c2Service.generatePayload(req.body);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating payload' });
    }
};

export const getPayloadFormats = async (_req: Request, res: Response) => {
    try {
        const formats = c2Service.getPayloadFormats();
        res.json(formats);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching payload formats' });
    }
};

// =========================================================================
// OVERLAY NETWORK CONTROLLERS
// =========================================================================

export const createOverlayNetwork = async (req: Request, res: Response) => {
    try {
        const { name, type, subnet, lighthouseIp } = req.body;
        const overlay = await overlayService.createOverlayNetwork({
            name,
            type,
            subnet,
            lighthouseIp
        });
        res.status(201).json(overlay);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error creating overlay network' });
    }
};

export const listOverlayNetworks = async (_req: Request, res: Response) => {
    try {
        const overlays = await overlayService.listOverlayNetworks();
        res.json(overlays);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error listing overlay networks' });
    }
};

export const getOverlayNetwork = async (req: Request, res: Response) => {
    try {
        const overlay = await overlayService.getOverlayNetwork(req.params.id);
        res.json(overlay);
    } catch (error) {
        res.status(404).json({ message: error instanceof Error ? error.message : 'Overlay network not found' });
    }
};

export const deleteOverlayNetwork = async (req: Request, res: Response) => {
    try {
        await overlayService.deleteOverlayNetwork(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error deleting overlay network' });
    }
};

export const addOverlayPeer = async (req: Request, res: Response) => {
    try {
        const { redirectorId, overlayIp, isLighthouse } = req.body;
        const config = await overlayService.addPeer(req.params.id, {
            redirectorId,
            overlayIp,
            isLighthouse
        });
        res.status(201).json(config);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error adding overlay peer' });
    }
};

export const getOverlayPeers = async (req: Request, res: Response) => {
    try {
        const peers = await overlayService.getOverlayPeers(req.params.id);
        res.json(peers);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching overlay peers' });
    }
};

export const removeOverlayPeer = async (req: Request, res: Response) => {
    try {
        await overlayService.removePeer(req.params.id, req.params.peerId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error removing overlay peer' });
    }
};

// =========================================================================
// REDIRECTOR DEPLOYMENT CONTROLLERS
// =========================================================================

export const deployRedirector = async (req: Request, res: Response) => {
    try {
        const { name, tier, cloudProvider, region, vmSize, overlayNetworkId, forwardingMethod } = req.body;
        const redirector = await redirectorService.deployRedirector({
            name,
            tier,
            cloudProvider,
            region,
            vmSize,
            overlayNetworkId,
            forwardingMethod
        });
        res.status(201).json(redirector);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error deploying redirector' });
    }
};

export const destroyRedirector = async (req: Request, res: Response) => {
    try {
        await redirectorService.destroyRedirector(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error destroying redirector' });
    }
};

export const getRedirectorHealth = async (req: Request, res: Response) => {
    try {
        const health = await redirectorService.checkHealth(req.params.id);
        res.json(health);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error checking redirector health' });
    }
};

export const getAllRedirectorHealth = async (_req: Request, res: Response) => {
    try {
        const healthMap = await redirectorService.checkAllRedirectors();
        // Convert Map to object for JSON
        const health: Record<string, any> = {};
        healthMap.forEach((value, key) => {
            health[key] = value;
        });
        res.json(health);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error checking all redirectors' });
    }
};

export const configureRedirector = async (req: Request, res: Response) => {
    try {
        const result = await redirectorService.configureRedirectorById(req.params.id);
        if (!result.success) {
            res.status(400).json({ message: result.error });
            return;
        }
        res.json({ message: 'Redirector configured successfully' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error configuring redirector' });
    }
};

export const installOverlayOnRedirector = async (req: Request, res: Response) => {
    try {
        const { overlayNetworkId } = req.body;
        // Look up the overlay network to get its type
        const overlay = await overlayService.getOverlayNetwork(overlayNetworkId);
        const result = await redirectorService.installOverlay(req.params.id, overlay.type as 'nebula' | 'wireguard');
        if (!result.success) {
            res.status(400).json({ message: result.error });
            return;
        }
        res.json({ message: 'Overlay installed successfully' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error installing overlay' });
    }
};

export const configureRedirectorForwarding = async (req: Request, res: Response) => {
    try {
        const { method, listenPort, targetHost, targetPort } = req.body;
        await redirectorService.configureForwarding(req.params.id, {
            method,
            listenPort,
            targetHost,
            targetPort
        });
        res.json({ message: 'Forwarding configured successfully' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error configuring forwarding' });
    }
};

export const getRedirectorDeployment = async (req: Request, res: Response) => {
    try {
        const deployment = await redirectorService.getDeployment(req.params.id);
        res.json(deployment);
    } catch (error) {
        res.status(404).json({ message: error instanceof Error ? error.message : 'Deployment not found' });
    }
};

// =========================================================================
// TRAFFIC ROUTING CONTROLLERS
// =========================================================================

export const createRoute = async (req: Request, res: Response) => {
    try {
        const { listenerId, hops, forwardingMethod } = req.body;
        const route = await routingService.createRoute({
            listenerId,
            hops,
            forwardingMethod
        });
        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error creating route' });
    }
};

export const listRoutes = async (_req: Request, res: Response) => {
    try {
        const routes = await routingService.listRoutes();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error listing routes' });
    }
};

export const getRoute = async (req: Request, res: Response) => {
    try {
        const route = await routingService.getRouteDetails(req.params.id);
        res.json(route);
    } catch (error) {
        res.status(404).json({ message: error instanceof Error ? error.message : 'Route not found' });
    }
};

export const updateRoute = async (req: Request, res: Response) => {
    try {
        const { hops } = req.body;
        const route = await routingService.updateRoute(req.params.id, hops);
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error updating route' });
    }
};

export const deleteRoute = async (req: Request, res: Response) => {
    try {
        await routingService.deleteRoute(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error deleting route' });
    }
};

export const toggleRoute = async (req: Request, res: Response) => {
    try {
        const route = await routingService.toggleRoute(req.params.id);
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error toggling route' });
    }
};

export const applyRoute = async (req: Request, res: Response) => {
    try {
        await routingService.applyRouting(req.params.id);
        res.json({ message: 'Route applied successfully' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error applying route' });
    }
};

export const getRouteDiagram = async (req: Request, res: Response) => {
    try {
        const diagram = await routingService.getRouteDiagram(req.params.id);
        res.json({ diagram });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating route diagram' });
    }
};

export const getRouteFlowchart = async (req: Request, res: Response) => {
    try {
        const flowchart = await routingService.getRouteFlowchart(req.params.id);
        res.json(flowchart);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating route flowchart' });
    }
};

export const getListenerRoutes = async (req: Request, res: Response) => {
    try {
        const routes = await routingService.getListenerRoutes(req.params.id);
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching listener routes' });
    }
};
