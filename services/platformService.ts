import axios from 'axios';
import { SiemConfig, SiemRule, McpConfig } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/ai', '') || 'http://localhost:3001/api/v1';

const client = axios.create({ baseURL: BASE_URL });

// --- SIEM ---

export const getSiemConfig = async (): Promise<SiemConfig> => {
    const res = await client.get('/siem/config');
    return res.data;
};

export const saveSiemConfig = async (config: SiemConfig): Promise<void> => {
    await client.post('/siem/config', config);
};

export const testSiemConnection = async (config: Partial<SiemConfig>): Promise<{ success: boolean; message: string }> => {
    const res = await client.post('/siem/test', config);
    return res.data;
};

export const querySiem = async (query: string): Promise<any> => {
    const res = await client.post('/siem/query', { query });
    return res.data;
};

export const submitDslQuery = async (query: string): Promise<any> => {
    const res = await client.post('/siem/submit-dsl', { query });
    return res.data;
};

export const getSiemRules = async (): Promise<SiemRule[]> => {
    const res = await client.get('/siem/rules');
    return res.data;
};

export const toggleSiemRule = async (id: string): Promise<void> => {
    await client.post(`/siem/rules/${id}/toggle`);
};

// --- MCP Config ---

export const getMcpConfig = async (): Promise<McpConfig> => {
    const res = await client.get('/mcp/config');
    return res.data;
};

export const saveMcpConfig = async (config: McpConfig): Promise<void> => {
    await client.post('/mcp/config', config);
};
