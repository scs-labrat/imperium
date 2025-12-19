import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMcpConfig = async (req: Request, res: Response) => {
    try {
        let config = await prisma.mcpConfig.findUnique({ where: { id: 'default' } });
        if (!config) {
            // Return default config pointing to our internal server
            res.json({
                command: 'npx',
                args: ['ts-node', 'src/mcp-osint-server.ts'],
                enabled: true
            });
            return;
        }
        res.json({
            ...config,
            args: JSON.parse(config.args)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching MCP config' });
    }
};

export const saveMcpConfig = async (req: Request, res: Response) => {
    try {
        const { command, args, enabled } = req.body;
        const config = await prisma.mcpConfig.upsert({
            where: { id: 'default' },
            update: { command, args: JSON.stringify(args), enabled },
            create: { id: 'default', command, args: JSON.stringify(args), enabled }
        });
        res.json({
            ...config,
            args: JSON.parse(config.args)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error saving MCP config' });
    }
};
