
import { Router } from 'express';
import { 
    getListeners, createListener, deleteListener, toggleListenerStatus,
    getRedirectors, createRedirector, deleteRedirector,
    getAgents, getAgent, executeCommand, runTask,
    getLoot
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
router.get('/agents/:id', getAgent);
router.post('/agents/:id/command', executeCommand);
router.post('/agents/:id/task', runTask);

// Loot Routes
router.get('/loot', getLoot);

export default router;
