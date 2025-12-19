import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Listener, Agent, Loot, SiemConfig, SiemRule, Redirector, McpConfig } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'; // Base URL is v1 now, specific routes handle subpaths
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Initialize Socket.IO
const socket: Socket = io(SOCKET_URL);

socket.on('connect', () => {
    console.log('Connected to C2 WebSocket');
});

// Helper to handle API errors
const handleApiError = (error: any, defaultMessage: string) => {
    if (axios.isAxiosError(error) && error.response) {
        console.error(`API Error: ${error.response.data.message || defaultMessage}`);
    } else {
        console.error(`Unexpected error: ${defaultMessage}`);
    }
};

export const c2Service = {
    // --- Socket.IO ---
    on: (event: string, callback: (data: any) => void) => {
        socket.on(event, callback);
    },
    off: (event: string, callback?: (data: any) => void) => {
        socket.off(event, callback);
    },

    // --- MCP Configuration ---
    getMcpConfig: async (): Promise<McpConfig> => {
        try {
            const response = await apiClient.get<McpConfig>('/mcp/config');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching MCP config');
            throw error;
        }
    },
    saveMcpConfig: async (config: McpConfig): Promise<McpConfig> => {
        try {
            const response = await apiClient.post<McpConfig>('/mcp/config', config);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error saving MCP config');
            throw error;
        }
    },

    // --- Listener Management ---
    getListeners: async (): Promise<Listener[]> => {
        try {
            const response = await apiClient.get<Listener[]>('/c2/listeners');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching listeners');
            return [];
        }
    },
    createListener: async (newListenerData: Omit<Listener, 'id' | 'status'>): Promise<Listener> => {
        try {
            const response = await apiClient.post<Listener>('/c2/listeners', newListenerData);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error creating listener');
            throw error;
        }
    },
    deleteListener: async (id: string): Promise<void> => {
        try {
            await apiClient.delete(`/c2/listeners/${id}`);
        } catch (error) {
            handleApiError(error, 'Error deleting listener');
        }
    },
    toggleListenerStatus: async (id: string, status: 'active' | 'inactive'): Promise<Listener> => {
        try {
            const response = await apiClient.put<Listener>(`/c2/listeners/${id}/status`, { status });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error updating listener status');
            throw error;
        }
    },

    // --- Redirector Management ---
    getRedirectors: async (): Promise<Redirector[]> => {
        try {
            const response = await apiClient.get<Redirector[]>('/c2/redirectors');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching redirectors');
            return [];
        }
    },
    createRedirector: async (newRedirectorData: Omit<Redirector, 'id' | 'status'>): Promise<Redirector> => {
        try {
            const response = await apiClient.post<Redirector>('/c2/redirectors', newRedirectorData);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error creating redirector');
            throw error;
        }
    },
    deleteRedirector: async (id: string): Promise<void> => {
        try {
            await apiClient.delete(`/c2/redirectors/${id}`);
        } catch (error) {
            handleApiError(error, 'Error deleting redirector');
        }
    },

    // --- Agent Management ---
    getAgents: async (): Promise<Agent[]> => {
        try {
            const response = await apiClient.get<Agent[]>('/c2/agents');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching agents');
            return [];
        }
    },
    getAgent: async (id: string): Promise<Agent> => {
        try {
            const response = await apiClient.get<Agent>(`/c2/agents/${id}`);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching agent');
            throw error;
        }
    },
        simulateNewAgent: async (listenerId: string, os: Agent['os']): Promise<Agent> => {
            try {
                const response = await apiClient.post<Agent>('/c2/agents/simulate', { listenerId, os });
                return response.data;
            } catch (error) {
                handleApiError(error, 'Error simulating agent');
                throw error;
            }
        },
    
        checkInAgent: async (listenerId: string, os: Agent['os']): Promise<Agent> => {
            try {
                const response = await apiClient.post<Agent>('/c2/agents/check-in', { listenerId, os });
                return response.data;
            } catch (error) {
                handleApiError(error, 'Error checking in agent');
                throw error;
            }
        },
    
        executeCommand: async (agentId: string, command: string): Promise<string> => {
            try {
                const response = await apiClient.post<{ output: string }>(`/c2/agents/${agentId}/command`, { command });
                return response.data.output;
            } catch (error) {
                handleApiError(error, 'Error executing command');
                throw error;
            }
        },
    runTask: async (agentId: string, task: string): Promise<Loot> => {
        try {
            const response = await apiClient.post<Loot>(`/c2/agents/${agentId}/task`, { task });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error running task');
            throw error;
        }
    },

    // --- Loot Management ---
    getLoot: async (): Promise<Loot[]> => {
        try {
            const response = await apiClient.get<Loot[]>('/c2/loot');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching loot');
            return [];
        }
    },

    // --- SIEM Management ---
    getSiemConfig: async (): Promise<SiemConfig> => {
        try {
            const response = await apiClient.get<SiemConfig>('/c2/siem/config');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching SIEM config');
            throw error;
        }
    },
    saveSiemConfig: async (config: SiemConfig): Promise<SiemConfig> => {
        try {
            const response = await apiClient.post<SiemConfig>('/c2/siem/config', config);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error saving SIEM config');
            throw error;
        }
    },
    testSiemConnection: async (config: SiemConfig): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await apiClient.post<{ success: boolean; message: string }>('/c2/siem/test', config);
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error testing SIEM connection');
            return { success: false, message: 'Connection failed' };
        }
    },
    querySiem: async (kqlQuery: string): Promise<any[]> => {
        try {
            const response = await apiClient.post<any[]>('/c2/siem/query', { query: kqlQuery });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error querying SIEM');
            return [];
        }
    },
    getSiemRules: async (): Promise<SiemRule[]> => {
        try {
            const response = await apiClient.get<SiemRule[]>('/c2/siem/rules');
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching SIEM rules');
            return [];
        }
    },
    toggleSiemRule: async (ruleId: string): Promise<SiemRule> => {
        try {
            const response = await apiClient.put<SiemRule>(`/c2/siem/rules/${ruleId}`, {});
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error toggling SIEM rule');
            throw error;
        }
    },
    submitDslQuery: async (dslQuery: string): Promise<any> => {
        try {
            const response = await apiClient.post<any>('/c2/siem/dsl', { dslQuery });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error submitting DSL query');
            throw error;
        }
    },
};
