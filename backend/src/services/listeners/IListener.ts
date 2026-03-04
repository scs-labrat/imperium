import { EventEmitter } from 'events';

/**
 * IListener - Interface for C2 listener implementations
 * Each listener type (HTTP, HTTPS, DNS, SMB, etc.) implements this interface
 */

export interface ListenerConfig {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    hostHeader?: string;
    redirectorId?: string;
}

export interface AgentCheckInData {
    agentId: string;
    os: string;
    osVersion: string;
    hostname: string;
    user: string;
    privileges: string;
    ip: string;
    externalIp: string;
    pid: number;
    processName: string;
    processInjectionTarget?: string;
    sessionKey?: string; // Encrypted AES session key (RSA-encrypted)
}

export interface TaskResultData {
    taskId: string;
    agentId: string;
    success: boolean;
    output?: string;
    error?: string;
}

export interface ListenerEvents {
    'agent_checkin': (data: AgentCheckInData, remoteAddr: string) => void;
    'task_result': (data: TaskResultData) => void;
    'error': (error: Error) => void;
    'started': () => void;
    'stopped': () => void;
}

export interface IListener extends EventEmitter {
    readonly config: ListenerConfig;

    /**
     * Start the listener - begin accepting connections
     */
    start(): Promise<void>;

    /**
     * Stop the listener - close all connections
     */
    stop(): Promise<void>;

    /**
     * Check if the listener is currently running
     */
    isRunning(): boolean;

    // Type-safe event emitters
    on<K extends keyof ListenerEvents>(event: K, listener: ListenerEvents[K]): this;
    emit<K extends keyof ListenerEvents>(event: K, ...args: Parameters<ListenerEvents[K]>): boolean;
}

export type ListenerType = 'HTTP' | 'HTTPS' | 'DNS' | 'SMB' | 'TCP';
