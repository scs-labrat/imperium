import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

/**
 * OverlayService - Manages Nebula and WireGuard overlay networks
 * Handles certificate generation, key management, and configuration
 */

export type OverlayType = 'nebula' | 'wireguard';

export interface CreateOverlayConfig {
    name: string;
    type: OverlayType;
    subnet: string;  // e.g., "10.42.0.0/16" for Nebula, "10.43.0.0/24" for WireGuard
    lighthouseIp?: string;  // IP for the lighthouse/server within the subnet
}

export interface OverlayPeerConfig {
    redirectorId: string;
    overlayIp: string;  // IP within the overlay subnet
    groups?: string[];  // Nebula groups
    isLighthouse?: boolean;  // Is this a lighthouse (Nebula) or server (WireGuard)
}

export interface GeneratedCertificate {
    privateKey: string;
    publicKey: string;
    certificate?: string;  // Nebula certificate
    config: string;  // Generated config file content
}

class OverlayService {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp', 'overlay');
    }

    /**
     * Initialize temp directory
     */
    private async ensureTempDir(): Promise<void> {
        await fs.mkdir(this.tempDir, { recursive: true });
    }

    // =========================================================================
    // OVERLAY NETWORK MANAGEMENT
    // =========================================================================

    /**
     * Create a new overlay network
     */
    async createOverlayNetwork(config: CreateOverlayConfig): Promise<any> {
        await this.ensureTempDir();

        if (config.type === 'nebula') {
            return this.createNebulaNetwork(config);
        } else {
            return this.createWireGuardNetwork(config);
        }
    }

    /**
     * Delete an overlay network
     */
    async deleteOverlayNetwork(overlayId: string): Promise<void> {
        // Delete all peer configs first
        await prisma.redirectorOverlayConfig.deleteMany({
            where: { overlayNetworkId: overlayId }
        });

        // Delete the network
        await prisma.overlayNetwork.delete({
            where: { id: overlayId }
        });
    }

    /**
     * List all overlay networks
     */
    async listOverlayNetworks(): Promise<any[]> {
        const networks = await prisma.overlayNetwork.findMany({
            include: {
                peers: {
                    include: {
                        redirector: true
                    }
                }
            }
        });

        return networks.map(n => ({
            ...n,
            peerCount: n.peers.length
        }));
    }

    /**
     * Get a single overlay network by ID
     */
    async getOverlayNetwork(overlayId: string): Promise<any> {
        const network = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId },
            include: {
                peers: {
                    include: {
                        redirector: true
                    }
                }
            }
        });

        if (!network) {
            throw new Error('Overlay network not found');
        }

        return {
            ...network,
            peerCount: network.peers.length
        };
    }

    /**
     * Get peers for an overlay network
     */
    async getOverlayPeers(overlayId: string): Promise<any[]> {
        const peers = await prisma.redirectorOverlayConfig.findMany({
            where: { overlayNetworkId: overlayId },
            include: {
                redirector: true
            }
        });

        return peers.map(p => ({
            id: p.id,
            redirectorId: p.redirectorId,
            redirectorName: p.redirector.name,
            overlayIp: p.overlayIp,
            publicKey: p.publicKey
        }));
    }

    /**
     * Add a peer to an overlay network
     */
    async addPeer(overlayId: string, config: OverlayPeerConfig): Promise<any> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId }
        });

        if (!overlay) {
            throw new Error('Overlay network not found');
        }

        if (overlay.type === 'nebula') {
            return this.generateNebulaCert(overlayId, config);
        } else {
            return this.generateWireGuardPeer(overlayId, config);
        }
    }

    /**
     * Remove a peer from an overlay network
     */
    async removePeer(overlayId: string, redirectorId: string): Promise<void> {
        await prisma.redirectorOverlayConfig.deleteMany({
            where: {
                overlayNetworkId: overlayId,
                redirectorId
            }
        });
    }

    // =========================================================================
    // NEBULA OPERATIONS
    // =========================================================================

    /**
     * Create a new Nebula network with CA
     */
    private async createNebulaNetwork(config: CreateOverlayConfig): Promise<any> {
        // Generate Nebula CA certificate
        const caKey = this.generateNebulaKey();
        const caCert = this.generateNebulaCACert(caKey, config.name);

        // Store in database
        const overlay = await prisma.overlayNetwork.create({
            data: {
                name: config.name,
                type: 'nebula',
                subnet: config.subnet,
                caKey: this.encryptKey(caKey),
                caCert: caCert,
                config: JSON.stringify({
                    lighthouseIp: config.lighthouseIp || this.getFirstIpInSubnet(config.subnet)
                })
            }
        });

        return {
            id: overlay.id,
            name: overlay.name,
            type: overlay.type,
            subnet: overlay.subnet,
            caCert: overlay.caCert
        };
    }

    /**
     * Generate Nebula certificate for a redirector
     */
    private async generateNebulaCert(overlayId: string, config: OverlayPeerConfig): Promise<any> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId }
        });

        if (!overlay || overlay.type !== 'nebula') {
            throw new Error('Invalid Nebula overlay network');
        }

        const redirector = await prisma.redirector.findUnique({
            where: { id: config.redirectorId }
        });

        if (!redirector) {
            throw new Error('Redirector not found');
        }

        // Generate host keypair
        const hostKey = this.generateNebulaKey();
        const hostPubKey = this.deriveNebulaPublicKey(hostKey);

        // Sign certificate with CA
        const caKey = this.decryptKey(overlay.caKey!);
        const hostCert = this.signNebulaCert(
            caKey,
            overlay.caCert!,
            hostPubKey,
            redirector.name,
            config.overlayIp,
            config.groups || ['redirectors', 'imperium'],
            config.isLighthouse || false
        );

        // Generate config
        const overlayConfig = JSON.parse(overlay.config || '{}');
        const nebulaConfig = this.generateNebulaConfig({
            caCert: overlay.caCert!,
            hostCert,
            hostKey,
            overlayIp: config.overlayIp,
            subnet: overlay.subnet,
            isLighthouse: config.isLighthouse || false,
            lighthouseIp: overlayConfig.lighthouseIp,
            lighthousePublicIp: config.isLighthouse ? redirector.ip : null
        });

        // Store peer config
        const peerConfig = await prisma.redirectorOverlayConfig.create({
            data: {
                redirectorId: config.redirectorId,
                overlayNetworkId: overlayId,
                overlayIp: config.overlayIp,
                privateKey: this.encryptKey(hostKey),
                publicKey: hostPubKey,
                certificate: hostCert,
                config: nebulaConfig
            }
        });

        // Update redirector with overlay IP
        await prisma.redirector.update({
            where: { id: config.redirectorId },
            data: { overlayIp: config.overlayIp }
        });

        return {
            id: peerConfig.id,
            redirectorId: config.redirectorId,
            overlayIp: config.overlayIp,
            config: nebulaConfig,
            certificate: hostCert
        };
    }

    /**
     * Get Nebula CA certificate
     */
    async getNebulaCaCert(overlayId: string): Promise<string> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId }
        });

        if (!overlay || !overlay.caCert) {
            throw new Error('Nebula CA certificate not found');
        }

        return overlay.caCert;
    }

    // =========================================================================
    // WIREGUARD OPERATIONS
    // =========================================================================

    /**
     * Create a new WireGuard network
     */
    private async createWireGuardNetwork(config: CreateOverlayConfig): Promise<any> {
        // Generate server keypair
        const serverKey = this.generateWireGuardKey();
        const serverPubKey = this.deriveWireGuardPublicKey(serverKey);

        const overlay = await prisma.overlayNetwork.create({
            data: {
                name: config.name,
                type: 'wireguard',
                subnet: config.subnet,
                serverKey: this.encryptKey(serverKey),
                serverPubKey: serverPubKey,
                listenPort: 51820,
                config: JSON.stringify({
                    serverIp: config.lighthouseIp || this.getFirstIpInSubnet(config.subnet)
                })
            }
        });

        return {
            id: overlay.id,
            name: overlay.name,
            type: overlay.type,
            subnet: overlay.subnet,
            serverPublicKey: serverPubKey
        };
    }

    /**
     * Generate WireGuard peer configuration
     */
    private async generateWireGuardPeer(overlayId: string, config: OverlayPeerConfig): Promise<any> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId }
        });

        if (!overlay || overlay.type !== 'wireguard') {
            throw new Error('Invalid WireGuard overlay network');
        }

        const redirector = await prisma.redirector.findUnique({
            where: { id: config.redirectorId }
        });

        if (!redirector) {
            throw new Error('Redirector not found');
        }

        // Generate peer keypair
        const peerKey = this.generateWireGuardKey();
        const peerPubKey = this.deriveWireGuardPublicKey(peerKey);

        // Generate config
        const overlayConfig = JSON.parse(overlay.config || '{}');
        const wgConfig = this.generateWireGuardConfig({
            privateKey: peerKey,
            overlayIp: config.overlayIp,
            subnet: overlay.subnet,
            serverPublicKey: overlay.serverPubKey!,
            serverEndpoint: overlayConfig.serverEndpoint || '',
            listenPort: overlay.listenPort || 51820,
            isServer: config.isLighthouse || false
        });

        // Store peer config
        const peerConfig = await prisma.redirectorOverlayConfig.create({
            data: {
                redirectorId: config.redirectorId,
                overlayNetworkId: overlayId,
                overlayIp: config.overlayIp,
                privateKey: this.encryptKey(peerKey),
                publicKey: peerPubKey,
                config: wgConfig
            }
        });

        // Update redirector
        await prisma.redirector.update({
            where: { id: config.redirectorId },
            data: { overlayIp: config.overlayIp }
        });

        return {
            id: peerConfig.id,
            redirectorId: config.redirectorId,
            overlayIp: config.overlayIp,
            publicKey: peerPubKey,
            config: wgConfig
        };
    }

    /**
     * Get WireGuard server configuration
     */
    async getWireGuardServerConfig(overlayId: string): Promise<string> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayId },
            include: { peers: true }
        });

        if (!overlay || overlay.type !== 'wireguard') {
            throw new Error('Invalid WireGuard overlay network');
        }

        const overlayConfig = JSON.parse(overlay.config || '{}');
        const serverKey = this.decryptKey(overlay.serverKey!);

        let config = `[Interface]
Address = ${overlayConfig.serverIp}/${overlay.subnet.split('/')[1]}
ListenPort = ${overlay.listenPort || 51820}
PrivateKey = ${serverKey}
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

`;

        for (const peer of overlay.peers) {
            config += `[Peer]
PublicKey = ${peer.publicKey}
AllowedIPs = ${peer.overlayIp}/32
PersistentKeepalive = 25

`;
        }

        return config;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    /**
     * Generate Nebula private key (ED25519)
     */
    private generateNebulaKey(): string {
        const keypair = crypto.generateKeyPairSync('ed25519');
        return keypair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    }

    /**
     * Derive Nebula public key from private key
     */
    private deriveNebulaPublicKey(privateKey: string): string {
        const key = crypto.createPrivateKey(privateKey);
        return crypto.createPublicKey(key).export({ type: 'spki', format: 'pem' }) as string;
    }

    /**
     * Generate Nebula CA certificate (simplified - in production use nebula-cert)
     */
    private generateNebulaCACert(caKey: string, name: string): string {
        // In production, this would call nebula-cert ca
        // For now, return a placeholder indicating CA creation
        const hash = crypto.createHash('sha256').update(caKey + name).digest('hex').substring(0, 16);
        return `-----BEGIN NEBULA CERTIFICATE-----
CA: ${name}
Fingerprint: ${hash}
Valid: 365 days
-----END NEBULA CERTIFICATE-----`;
    }

    /**
     * Sign Nebula host certificate
     */
    private signNebulaCert(
        caKey: string,
        caCert: string,
        hostPubKey: string,
        name: string,
        ip: string,
        groups: string[],
        isLighthouse: boolean
    ): string {
        // In production, this would call nebula-cert sign
        const hash = crypto.createHash('sha256')
            .update(caKey + hostPubKey + name + ip)
            .digest('hex').substring(0, 16);

        return `-----BEGIN NEBULA CERTIFICATE-----
Name: ${name}
IP: ${ip}/24
Groups: ${groups.join(', ')}
IsLighthouse: ${isLighthouse}
Fingerprint: ${hash}
Valid: 365 days
-----END NEBULA CERTIFICATE-----`;
    }

    /**
     * Generate Nebula configuration file
     */
    private generateNebulaConfig(params: {
        caCert: string;
        hostCert: string;
        hostKey: string;
        overlayIp: string;
        subnet: string;
        isLighthouse: boolean;
        lighthouseIp: string;
        lighthousePublicIp?: string | null;
    }): string {
        return `# Nebula Configuration - Generated by Imperium C2

pki:
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/host.crt
  key: /etc/nebula/host.key

static_host_map:
${!params.isLighthouse ? `  "${params.lighthouseIp}": ["${params.lighthousePublicIp || 'LIGHTHOUSE_PUBLIC_IP'}:4242"]` : ''}

lighthouse:
  am_lighthouse: ${params.isLighthouse}
  interval: 60
${!params.isLighthouse ? `  hosts:
    - "${params.lighthouseIp}"` : ''}

listen:
  host: 0.0.0.0
  port: 4242

punchy:
  punch: true
  respond: true

relay:
  am_relay: ${params.isLighthouse}
  use_relays: ${!params.isLighthouse}

tun:
  disabled: false
  dev: nebula1
  mtu: 1300

logging:
  level: info
  format: text

firewall:
  outbound:
    - port: any
      proto: any
      host: any

  inbound:
    - port: any
      proto: icmp
      host: any
    - port: any
      proto: any
      groups:
        - imperium
        - redirectors
`;
    }

    /**
     * Generate WireGuard private key
     */
    private generateWireGuardKey(): string {
        return crypto.randomBytes(32).toString('base64');
    }

    /**
     * Derive WireGuard public key (simplified)
     */
    private deriveWireGuardPublicKey(privateKey: string): string {
        // In production, use wg pubkey
        return crypto.createHash('sha256')
            .update(Buffer.from(privateKey, 'base64'))
            .digest('base64');
    }

    /**
     * Generate WireGuard configuration file
     */
    private generateWireGuardConfig(params: {
        privateKey: string;
        overlayIp: string;
        subnet: string;
        serverPublicKey: string;
        serverEndpoint: string;
        listenPort: number;
        isServer: boolean;
    }): string {
        if (params.isServer) {
            return `[Interface]
Address = ${params.overlayIp}/${params.subnet.split('/')[1]}
ListenPort = ${params.listenPort}
PrivateKey = ${params.privateKey}
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
`;
        }

        return `[Interface]
Address = ${params.overlayIp}/${params.subnet.split('/')[1]}
PrivateKey = ${params.privateKey}

[Peer]
PublicKey = ${params.serverPublicKey}
Endpoint = ${params.serverEndpoint}:${params.listenPort}
AllowedIPs = ${params.subnet}
PersistentKeepalive = 25
`;
    }

    /**
     * Encrypt a key for storage
     */
    private encryptKey(key: string): string {
        // In production, use proper encryption with a master key
        return Buffer.from(key).toString('base64');
    }

    /**
     * Decrypt a stored key
     */
    private decryptKey(encryptedKey: string): string {
        return Buffer.from(encryptedKey, 'base64').toString('utf8');
    }

    /**
     * Get first usable IP in a subnet
     */
    private getFirstIpInSubnet(subnet: string): string {
        const [base] = subnet.split('/');
        const parts = base.split('.');
        parts[3] = '1';
        return parts.join('.');
    }
}

// Singleton instance
export const overlayService = new OverlayService();

// Export class for testing
export { OverlayService };
