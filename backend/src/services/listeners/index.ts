import { HttpListener } from './HttpListener.js';
import type { IListener, ListenerConfig, ListenerType } from './IListener.js';

export type { IListener, ListenerConfig, ListenerType, AgentCheckInData, TaskResultData, ListenerEvents } from './IListener.js';
export { HttpListener } from './HttpListener.js';

/**
 * Create a listener based on configuration
 * Factory function for instantiating the appropriate listener type
 */
export function createListener(config: ListenerConfig, options?: any): IListener {
    const type = config.type.toUpperCase() as ListenerType;

    switch (type) {
        case 'HTTP':
            return new HttpListener(config);

        case 'HTTPS':
            if (!options?.key || !options?.cert) {
                throw new Error('HTTPS listener requires TLS key and certificate');
            }
            return new HttpListener(config, { key: options.key, cert: options.cert });

        case 'DNS':
            // DNS listener not yet implemented
            throw new Error('DNS listener not yet implemented');

        case 'SMB':
            // SMB listener not yet implemented
            throw new Error('SMB listener not yet implemented');

        case 'TCP':
            // Raw TCP listener not yet implemented
            throw new Error('TCP listener not yet implemented');

        default:
            throw new Error(`Unknown listener type: ${type}`);
    }
}

/**
 * Check if a listener type is supported
 */
export function isListenerTypeSupported(type: string): boolean {
    const supportedTypes: ListenerType[] = ['HTTP', 'HTTPS'];
    return supportedTypes.includes(type.toUpperCase() as ListenerType);
}
