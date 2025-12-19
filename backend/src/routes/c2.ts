
import { Router } from 'express';
import { 
    getListeners, createListener, deleteListener, toggleListenerStatus,
    getRedirectors, createRedirector, deleteRedirector,
    getAgents, getAgent, executeCommand, runTask, simulateNewAgent, checkInAgent,
    getLoot,
    getSiemConfig, saveSiemConfig, testSiemConnection, querySiem, getSiemRules, toggleSiemRule, submitDslQuery
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

export default router;
