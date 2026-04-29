import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { elasticsearchService } from '../services/elasticsearchService.js';

const prisma = new PrismaClient();

export const getSiemConfig = async (req: Request, res: Response) => {
    try {
        const config = await prisma.siemConfig.findUnique({ where: { id: 'default' } });
        if (!config) {
            res.json({ url: '', apiKey: '', connected: false, verifyTls: true, indexPattern: 'logs-*' });
            return;
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SIEM config' });
    }
};

export const saveSiemConfig = async (req: Request, res: Response) => {
    try {
        const { url, apiKey, connected, verifyTls, cloudId, indexPattern } = req.body;
        const config = await prisma.siemConfig.upsert({
            where: { id: 'default' },
            update: { url, apiKey, connected: connected ?? false, verifyTls: verifyTls ?? true, cloudId, indexPattern: indexPattern || 'logs-*' },
            create: { id: 'default', url, apiKey, connected: connected ?? false, verifyTls: verifyTls ?? true, cloudId, indexPattern: indexPattern || 'logs-*' }
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error saving SIEM config' });
    }
};

export const testSiemConnection = async (req: Request, res: Response) => {
    try {
        const { url, apiKey, verifyTls, cloudId, indexPattern } = req.body;
        const result = await elasticsearchService.connect({ url, apiKey, verifyTls, cloudId, indexPattern });
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: String(error) });
    }
};

export const querySiem = async (req: Request, res: Response) => {
    try {
        const { query, indexPattern, timeRange } = req.body;
        const config = await prisma.siemConfig.findUnique({ where: { id: 'default' } });
        if (!config?.connected) {
            res.status(400).json({ message: 'SIEM not connected' });
            return;
        }
        await elasticsearchService.connect({ ...config, cloudId: config.cloudId ?? undefined });
        const results = await elasticsearchService.queryKql(query, { index: indexPattern || config.indexPattern || 'logs-*' });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: String(error) });
    }
};

export const submitDslQuery = async (req: Request, res: Response) => {
    try {
        const { query, indexPattern } = req.body;
        const config = await prisma.siemConfig.findUnique({ where: { id: 'default' } });
        if (!config?.connected) {
            res.status(400).json({ message: 'SIEM not connected' });
            return;
        }
        await elasticsearchService.connect({ ...config, cloudId: config.cloudId ?? undefined });
        const results = await elasticsearchService.queryDsl(query, { index: indexPattern || config.indexPattern || 'logs-*' });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: String(error) });
    }
};

export const getSiemRules = async (req: Request, res: Response) => {
    try {
        const rules = await prisma.siemRule.findMany();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SIEM rules' });
    }
};

export const toggleSiemRule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rule = await prisma.siemRule.findUnique({ where: { id } });
        if (!rule) {
            res.status(404).json({ message: 'Rule not found' });
            return;
        }
        const updated = await prisma.siemRule.update({ where: { id }, data: { enabled: !rule.enabled } });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling SIEM rule' });
    }
};
