
import { Router } from 'express';
import {
    getListeners, createListener, deleteListener, toggleListenerStatus,
    getRedirectors, createRedirector, deleteRedirector,
    getAgents, getAgent, executeCommand, runTask, simulateNewAgent, checkInAgent,
    getAgentTasks, getTask, getAgentTaskStats, cancelTask, retryTask, uploadFile, downloadFile,
    getLoot,
    getSiemConfig, saveSiemConfig, testSiemConnection, querySiem, getSiemRules, toggleSiemRule, submitDslQuery,
    generatePayload, getPayloadFormats,
    // Overlay Network Controllers
    createOverlayNetwork, listOverlayNetworks, getOverlayNetwork, deleteOverlayNetwork,
    addOverlayPeer, getOverlayPeers, removeOverlayPeer,
    // Redirector Deployment Controllers
    deployRedirector, destroyRedirector, getRedirectorHealth, getAllRedirectorHealth,
    configureRedirector, installOverlayOnRedirector, configureRedirectorForwarding, getRedirectorDeployment,
    // Traffic Routing Controllers
    createRoute, listRoutes, getRoute, updateRoute, deleteRoute, toggleRoute, applyRoute,
    getRouteDiagram, getRouteFlowchart, getListenerRoutes
} from '../controllers/c2Controller.js';

const router = Router();

// Listener Routes
router.get('/listeners', getListeners);
router.post('/listeners', createListener);
router.delete('/listeners/:id', deleteListener);
router.put('/listeners/:id/status', toggleListenerStatus);

// Redirector Routes
router.get('/redirectors', getRedirectors);
router.post('/redirectors', createRedirector);
router.delete('/redirectors/:id', deleteRedirector);

// Agent Routes
router.get('/agents', getAgents);
router.post('/agents/simulate', simulateNewAgent);
router.post('/agents/check-in', checkInAgent);
router.get('/agents/:id', getAgent);
router.post('/agents/:id/command', executeCommand);
router.post('/agents/:id/task', runTask);
router.get('/agents/:id/tasks', getAgentTasks);
router.get('/agents/:id/tasks/stats', getAgentTaskStats);
router.post('/agents/:id/upload', uploadFile);
router.post('/agents/:id/download', downloadFile);

// Task Routes
router.get('/tasks/:taskId', getTask);
router.post('/tasks/:taskId/cancel', cancelTask);
router.post('/tasks/:taskId/retry', retryTask);

// Loot Routes
router.get('/loot', getLoot);

// SIEM Routes
router.get('/siem/config', getSiemConfig);
router.post('/siem/config', saveSiemConfig);
router.post('/siem/test', testSiemConnection);
router.post('/siem/query', querySiem);
router.get('/siem/rules', getSiemRules);
router.put('/siem/rules/:id', toggleSiemRule);
router.post('/siem/dsl', submitDslQuery);

// Payload Generation Routes
router.get('/payloads/formats', getPayloadFormats);
router.post('/payloads/generate', generatePayload);

// =========================================================================
// OVERLAY NETWORK ROUTES
// =========================================================================
router.get('/overlays', listOverlayNetworks);
router.post('/overlays', createOverlayNetwork);
router.get('/overlays/:id', getOverlayNetwork);
router.delete('/overlays/:id', deleteOverlayNetwork);
router.get('/overlays/:id/peers', getOverlayPeers);
router.post('/overlays/:id/peers', addOverlayPeer);
router.delete('/overlays/:id/peers/:peerId', removeOverlayPeer);

// =========================================================================
// REDIRECTOR DEPLOYMENT ROUTES
// =========================================================================
router.post('/redirectors/deploy', deployRedirector);
router.get('/redirectors/health', getAllRedirectorHealth);
router.post('/redirectors/:id/destroy', destroyRedirector);
router.get('/redirectors/:id/health', getRedirectorHealth);
router.post('/redirectors/:id/configure', configureRedirector);
router.post('/redirectors/:id/overlay', installOverlayOnRedirector);
router.post('/redirectors/:id/forwarding', configureRedirectorForwarding);
router.get('/redirectors/:id/deployment', getRedirectorDeployment);

// =========================================================================
// TRAFFIC ROUTING ROUTES
// =========================================================================
router.get('/routes', listRoutes);
router.post('/routes', createRoute);
router.get('/routes/:id', getRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);
router.post('/routes/:id/toggle', toggleRoute);
router.post('/routes/:id/apply', applyRoute);
router.get('/routes/:id/diagram', getRouteDiagram);
router.get('/routes/:id/flowchart', getRouteFlowchart);

// Get routes for a specific listener
router.get('/listeners/:id/routes', getListenerRoutes);

export default router;
