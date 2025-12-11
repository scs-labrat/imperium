
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
    try {
        const newListener = await c2Service.createListener(req.body);
        res.status(201).json(newListener);
    } catch (error) {
        res.status(500).json({ message: 'Error creating listener' });
    }
};

export const deleteListener = async (req: Request, res: Response) => {
    try {
        await c2Service.deleteListener(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting listener' });
    }
};

export const toggleListenerStatus = async (req: Request, res: Response) => {
    try {
        const updatedListener = await c2Service.toggleListenerStatus(req.params.id, req.body.status);
        res.json(updatedListener);
    } catch (error) {
        res.status(500).json({ message: 'Error updating listener status' });
    }
};

export const getRedirectors = async (req: Request, res: Response) => {
    try {
        const redirectors = await c2Service.getRedirectors();
        res.json(redirectors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching redirectors' });
    }
};

export const createRedirector = async (req: Request, res: Response) => {
    try {
        const newRedirector = await c2Service.createRedirector(req.body);
        res.status(201).json(newRedirector);
    } catch (error) {
        res.status(500).json({ message: 'Error creating redirector' });
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
