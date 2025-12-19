
import { Request, Response } from 'express';
import * as c2Service from '../services/c2Service.js';

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
        const output = await c2Service.executeCommand(req.params.id, req.body.command);
        res.json({ output });
    } catch (error) {
        res.status(500).json({ message: 'Error executing command' });
    }
};

export const runTask = async (req: Request, res: Response) => {
    try {
        const newLoot = await c2Service.runTask(req.params.id, req.body.task);
        res.status(201).json(newLoot);
    } catch (error) {
        res.status(500).json({ message: 'Error running task' });
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
