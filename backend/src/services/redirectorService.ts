import { PrismaClient } from '@prisma/client';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { getIo } from '../socket.js';
import { overlayService } from './overlayService.js';

const prisma = new PrismaClient();

/**
 * RedirectorService - Handles redirector deployment via Terraform and configuration via Ansible
 */

export type CloudProvider = 'digitalocean' | 'aws' | 'azure' | 'vultr' | 'hetzner';
export type VmSize = 'small' | 'medium' | 'large';
export type DeploymentStatus = 'pending' | 'provisioning' | 'configuring' | 'active' | 'failed' | 'destroyed';

export interface RedirectorDeployConfig {
    name: string;
    tier: 'Edge' | 'Internal';
    cloudProvider: CloudProvider;
    region: string;
    vmSize: VmSize;
    overlayNetworkId?: string;
    upstreamRedirectorId?: string;
    forwardingMethod?: 'socat' | 'nginx' | 'haproxy' | 'rinetd';
    sshKeyId?: string;
}

export interface DeploymentResult {
    success: boolean;
    redirectorId: string;
    publicIp?: string;
    overlayIp?: string;
    error?: string;
}

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastCheck: Date;
    latencyMs?: number;
    details?: string;
}

class RedirectorService {
    private infrastructureDir: string;
    private terraformDir: string;
    private ansibleDir: string;
    private workingDir: string;

    constructor() {
        this.infrastructureDir = path.join(process.cwd(), 'src', 'infrastructure');
        this.terraformDir = path.join(this.infrastructureDir, 'terraform');
        this.ansibleDir = path.join(this.infrastructureDir, 'ansible');
        this.workingDir = path.join(process.cwd(), 'deployments');
    }

    // =========================================================================
    // DEPLOYMENT
    // =========================================================================

    /**
     * Deploy a new redirector
     */
    async deployRedirector(config: RedirectorDeployConfig): Promise<DeploymentResult> {
        // Create redirector record
        const redirectorId = `r${Date.now()}`;
        const redirector = await prisma.redirector.create({
            data: {
                id: redirectorId,
                name: config.name,
                type: 'HTTP/S',
                ip: 'pending',
                tier: config.tier,
                status: 'Provisioning',
                sshUser: 'root',
                sshKeyId: config.sshKeyId,
                upstreamId: config.upstreamRedirectorId
            }
        });

        // Create deployment record
        const deployment = await prisma.redirectorDeployment.create({
            data: {
                redirectorId: redirector.id,
                cloudProvider: config.cloudProvider,
                region: config.region,
                vmSize: config.vmSize,
                status: 'pending'
            }
        });

        // Emit status update
        this.emitDeploymentStatus(redirectorId, 'provisioning', 'Starting Terraform provisioning...');

        try {
            // Generate and apply Terraform
            const tfResult = await this.applyTerraform(redirector.id, config);

            if (!tfResult.success) {
                await this.updateDeploymentStatus(deployment.id, 'failed', tfResult.error);
                return { success: false, redirectorId, error: tfResult.error };
            }

            // Update with public IP
            await prisma.redirector.update({
                where: { id: redirectorId },
                data: { ip: tfResult.publicIp }
            });

            await prisma.redirectorDeployment.update({
                where: { id: deployment.id },
                data: { publicIp: tfResult.publicIp, status: 'configuring' }
            });

            this.emitDeploymentStatus(redirectorId, 'configuring', 'Running Ansible configuration...');

            // Run Ansible configuration
            const ansibleResult = await this.configureRedirector(redirectorId, {
                publicIp: tfResult.publicIp!,
                sshUser: config.cloudProvider === 'aws' ? 'ubuntu' : 'root'
            });

            if (!ansibleResult.success) {
                await this.updateDeploymentStatus(deployment.id, 'failed', ansibleResult.error);
                return { success: false, redirectorId, publicIp: tfResult.publicIp, error: ansibleResult.error };
            }

            // Configure overlay network if specified
            let overlayIp: string | undefined;
            if (config.overlayNetworkId) {
                const overlayResult = await this.setupOverlay(redirectorId, config.overlayNetworkId);
                overlayIp = overlayResult.overlayIp;

                await prisma.redirectorDeployment.update({
                    where: { id: deployment.id },
                    data: { overlayIp }
                });
            }

            // Mark as active
            await prisma.redirector.update({
                where: { id: redirectorId },
                data: { status: 'Healthy', overlayIp }
            });

            await this.updateDeploymentStatus(deployment.id, 'active');
            this.emitDeploymentStatus(redirectorId, 'active', 'Deployment complete');

            return {
                success: true,
                redirectorId,
                publicIp: tfResult.publicIp,
                overlayIp
            };

        } catch (error: any) {
            await this.updateDeploymentStatus(deployment.id, 'failed', error.message);
            return { success: false, redirectorId, error: error.message };
        }
    }

    /**
     * Destroy a redirector
     */
    async destroyRedirector(redirectorId: string): Promise<{ success: boolean; error?: string }> {
        const deployment = await prisma.redirectorDeployment.findUnique({
            where: { redirectorId }
        });

        if (!deployment) {
            // No deployment record, just delete the redirector
            await prisma.redirector.delete({ where: { id: redirectorId } });
            return { success: true };
        }

        this.emitDeploymentStatus(redirectorId, 'destroying', 'Running Terraform destroy...');

        try {
            // Run Terraform destroy
            await this.destroyTerraform(redirectorId);

            // Clean up overlay config
            await prisma.redirectorOverlayConfig.deleteMany({
                where: { redirectorId }
            });

            // Delete deployment and redirector
            await prisma.redirectorDeployment.delete({ where: { id: deployment.id } });
            await prisma.redirector.delete({ where: { id: redirectorId } });

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // TERRAFORM OPERATIONS
    // =========================================================================

    /**
     * Generate Terraform configuration for a redirector
     */
    async generateTerraform(redirectorId: string, config: RedirectorDeployConfig): Promise<string> {
        const sshKey = config.sshKeyId
            ? await prisma.sshKey.findUnique({ where: { id: config.sshKeyId } })
            : null;

        const tfConfig = `
terraform {
  required_providers {
    ${this.getTerraformProvider(config.cloudProvider)}
  }
}

module "redirector" {
  source = "${this.terraformDir}/modules/redirector"

  name           = "${config.name}"
  cloud_provider = "${config.cloudProvider}"
  region         = "${config.region}"
  vm_size        = "${config.vmSize}"
  ssh_public_key = "${sshKey?.publicKey || ''}"
  ssh_key_name   = "imperium-${redirectorId}"

  tags = {
    managed_by    = "imperium"
    redirector_id = "${redirectorId}"
    tier          = "${config.tier}"
  }
}

output "public_ip" {
  value = module.redirector.public_ip
}

output "private_ip" {
  value = module.redirector.private_ip
}

output "instance_id" {
  value = module.redirector.instance_id
}
`;

        return tfConfig;
    }

    /**
     * Apply Terraform configuration
     */
    async applyTerraform(redirectorId: string, config: RedirectorDeployConfig): Promise<{
        success: boolean;
        publicIp?: string;
        error?: string;
    }> {
        const deployDir = path.join(this.workingDir, redirectorId);
        await fs.mkdir(deployDir, { recursive: true });

        try {
            // Generate Terraform config
            const tfConfig = await this.generateTerraform(redirectorId, config);
            await fs.writeFile(path.join(deployDir, 'main.tf'), tfConfig);

            // Copy provider config
            await fs.copyFile(
                path.join(this.terraformDir, 'providers', 'providers.tf'),
                path.join(deployDir, 'providers.tf')
            );

            // Run terraform init
            await this.runCommand('terraform', ['init'], deployDir);

            // Run terraform apply
            const applyResult = await this.runCommand('terraform', ['apply', '-auto-approve', '-json'], deployDir);

            // Get outputs
            const outputResult = await this.runCommand('terraform', ['output', '-json'], deployDir);
            const outputs = JSON.parse(outputResult.stdout || '{}');

            // Save state to database
            const stateFile = await fs.readFile(path.join(deployDir, 'terraform.tfstate'), 'utf8');
            await prisma.redirectorDeployment.updateMany({
                where: { redirectorId },
                data: { terraformState: stateFile }
            });

            return {
                success: true,
                publicIp: outputs.public_ip?.value
            };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Destroy Terraform resources
     */
    async destroyTerraform(redirectorId: string): Promise<void> {
        const deployDir = path.join(this.workingDir, redirectorId);

        // Check if deployment directory exists
        try {
            await fs.access(deployDir);
        } catch {
            // No deployment directory, check for stored state
            const deployment = await prisma.redirectorDeployment.findUnique({
                where: { redirectorId }
            });

            if (deployment?.terraformState) {
                await fs.mkdir(deployDir, { recursive: true });
                await fs.writeFile(
                    path.join(deployDir, 'terraform.tfstate'),
                    deployment.terraformState
                );
            } else {
                return; // Nothing to destroy
            }
        }

        await this.runCommand('terraform', ['destroy', '-auto-approve'], deployDir);

        // Clean up deployment directory
        await fs.rm(deployDir, { recursive: true, force: true });
    }

    // =========================================================================
    // ANSIBLE OPERATIONS
    // =========================================================================

    /**
     * Configure a redirector using Ansible (standalone version)
     * Looks up IP and SSH user from database
     */
    async configureRedirectorById(redirectorId: string): Promise<{ success: boolean; error?: string }> {
        const redirector = await prisma.redirector.findUnique({
            where: { id: redirectorId },
            include: { deployment: true }
        });

        if (!redirector || !redirector.ip || redirector.ip === 'pending') {
            return { success: false, error: 'Redirector not found or not deployed' };
        }

        return this.configureRedirector(redirectorId, {
            publicIp: redirector.ip,
            sshUser: redirector.sshUser || 'root'
        });
    }

    /**
     * Configure a redirector using Ansible
     */
    async configureRedirector(redirectorId: string, options: {
        publicIp: string;
        sshUser: string;
    }): Promise<{ success: boolean; error?: string }> {
        const inventoryContent = `[redirectors]
${options.publicIp} ansible_user=${options.sshUser} ansible_ssh_common_args='-o StrictHostKeyChecking=no'
`;

        const deployDir = path.join(this.workingDir, redirectorId);
        await fs.mkdir(deployDir, { recursive: true });
        await fs.writeFile(path.join(deployDir, 'inventory'), inventoryContent);

        try {
            // Run base setup playbook
            await this.runCommand('ansible-playbook', [
                '-i', path.join(deployDir, 'inventory'),
                path.join(this.ansibleDir, 'playbooks', 'setup-redirector.yml')
            ], deployDir);

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Install overlay network on a redirector
     */
    async installOverlay(redirectorId: string, overlayType: 'nebula' | 'wireguard'): Promise<{
        success: boolean;
        error?: string;
    }> {
        const redirector = await prisma.redirector.findUnique({
            where: { id: redirectorId },
            include: { deployment: true }
        });

        if (!redirector || !redirector.ip) {
            return { success: false, error: 'Redirector not found or not deployed' };
        }

        const deployDir = path.join(this.workingDir, redirectorId);
        const playbook = overlayType === 'nebula'
            ? 'install-nebula.yml'
            : 'install-wireguard.yml';

        try {
            await this.runCommand('ansible-playbook', [
                '-i', path.join(deployDir, 'inventory'),
                path.join(this.ansibleDir, 'playbooks', playbook)
            ], deployDir);

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Configure forwarding on a redirector
     */
    async configureForwarding(redirectorId: string, options: {
        method: 'socat' | 'nginx' | 'haproxy' | 'rinetd';
        listenPort: number;
        targetHost: string;
        targetPort: number;
    }): Promise<{ success: boolean; error?: string }> {
        const redirector = await prisma.redirector.findUnique({
            where: { id: redirectorId }
        });

        if (!redirector || !redirector.ip) {
            return { success: false, error: 'Redirector not found or not deployed' };
        }

        const deployDir = path.join(this.workingDir, redirectorId);
        const extraVars = JSON.stringify({
            forwarding_method: options.method,
            listen_port: options.listenPort,
            target_host: options.targetHost,
            target_port: options.targetPort
        });

        try {
            await this.runCommand('ansible-playbook', [
                '-i', path.join(deployDir, 'inventory'),
                '-e', extraVars,
                path.join(this.ansibleDir, 'playbooks', 'configure-forwarding.yml')
            ], deployDir);

            // Update redirector with forwarding port
            await prisma.redirector.update({
                where: { id: redirectorId },
                data: { forwardPort: options.listenPort }
            });

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // OVERLAY SETUP
    // =========================================================================

    /**
     * Setup overlay network on redirector
     */
    private async setupOverlay(redirectorId: string, overlayNetworkId: string): Promise<{
        success: boolean;
        overlayIp?: string;
        error?: string;
    }> {
        const overlay = await prisma.overlayNetwork.findUnique({
            where: { id: overlayNetworkId }
        });

        if (!overlay) {
            return { success: false, error: 'Overlay network not found' };
        }

        // Assign next available IP
        const overlayIp = await this.getNextOverlayIp(overlayNetworkId, overlay.subnet);

        // Add peer to overlay
        await overlayService.addPeer(overlayNetworkId, {
            redirectorId,
            overlayIp
        });

        // Install overlay software
        await this.installOverlay(redirectorId, overlay.type as 'nebula' | 'wireguard');

        return { success: true, overlayIp };
    }

    /**
     * Get next available IP in overlay subnet
     */
    private async getNextOverlayIp(overlayId: string, subnet: string): Promise<string> {
        const existingPeers = await prisma.redirectorOverlayConfig.findMany({
            where: { overlayNetworkId: overlayId }
        });

        const usedIps = new Set(existingPeers.map(p => p.overlayIp));
        const [baseIp, maskStr] = subnet.split('/');
        const parts = baseIp.split('.').map(Number);

        // Start from .2 (assume .1 is lighthouse/server)
        for (let i = 2; i < 255; i++) {
            const ip = `${parts[0]}.${parts[1]}.${parts[2]}.${i}`;
            if (!usedIps.has(ip)) {
                return ip;
            }
        }

        throw new Error('No available IPs in overlay subnet');
    }

    // =========================================================================
    // DEPLOYMENT INFO
    // =========================================================================

    /**
     * Get deployment information for a redirector
     */
    async getDeployment(redirectorId: string): Promise<any> {
        const deployment = await prisma.redirectorDeployment.findUnique({
            where: { redirectorId },
            include: { redirector: true }
        });

        if (!deployment) {
            throw new Error('Deployment not found');
        }

        return {
            id: deployment.id,
            redirectorId: deployment.redirectorId,
            redirectorName: deployment.redirector.name,
            cloudProvider: deployment.cloudProvider,
            region: deployment.region,
            vmSize: deployment.vmSize,
            publicIp: deployment.publicIp,
            overlayIp: deployment.overlayIp,
            status: deployment.status,
            lastHealthCheck: deployment.lastHealthCheck,
            createdAt: deployment.createdAt
        };
    }

    // =========================================================================
    // HEALTH MONITORING
    // =========================================================================

    /**
     * Check health of a single redirector
     */
    async checkHealth(redirectorId: string): Promise<HealthStatus> {
        const redirector = await prisma.redirector.findUnique({
            where: { id: redirectorId }
        });

        if (!redirector || redirector.ip === 'pending') {
            return { status: 'unknown', lastCheck: new Date() };
        }

        try {
            const start = Date.now();
            // Simple TCP check on port 22
            const result = await this.runCommand('nc', ['-zv', '-w', '5', redirector.ip, '22'], process.cwd());
            const latency = Date.now() - start;

            // Update last health check
            await prisma.redirectorDeployment.updateMany({
                where: { redirectorId },
                data: { lastHealthCheck: new Date() }
            });

            return {
                status: 'healthy',
                lastCheck: new Date(),
                latencyMs: latency
            };

        } catch (error) {
            await prisma.redirector.update({
                where: { id: redirectorId },
                data: { status: 'Degraded' }
            });

            return {
                status: 'down',
                lastCheck: new Date(),
                details: 'SSH port unreachable'
            };
        }
    }

    /**
     * Check health of all redirectors
     */
    async checkAllRedirectors(): Promise<Map<string, HealthStatus>> {
        const redirectors = await prisma.redirector.findMany({
            where: {
                ip: { not: 'pending' }
            }
        });

        const results = new Map<string, HealthStatus>();

        for (const redirector of redirectors) {
            const status = await this.checkHealth(redirector.id);
            results.set(redirector.id, status);
        }

        return results;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    /**
     * Get Terraform provider configuration
     */
    private getTerraformProvider(provider: CloudProvider): string {
        const providers: Record<CloudProvider, string> = {
            digitalocean: `digitalocean = { source = "digitalocean/digitalocean" }`,
            aws: `aws = { source = "hashicorp/aws" }`,
            azure: `azurerm = { source = "hashicorp/azurerm" }`,
            vultr: `vultr = { source = "vultr/vultr" }`,
            hetzner: `hcloud = { source = "hetznercloud/hcloud" }`
        };
        return providers[provider];
    }

    /**
     * Run a command and return result
     */
    private runCommand(command: string, args: string[], cwd: string): Promise<{
        stdout: string;
        stderr: string;
    }> {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            const proc = spawn(command, args, { cwd, shell: true });

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Update deployment status
     */
    private async updateDeploymentStatus(
        deploymentId: string,
        status: DeploymentStatus,
        errorMessage?: string
    ): Promise<void> {
        await prisma.redirectorDeployment.update({
            where: { id: deploymentId },
            data: {
                status,
                errorMessage: errorMessage || null
            }
        });
    }

    /**
     * Emit deployment status via Socket.IO
     */
    private emitDeploymentStatus(redirectorId: string, status: string, message: string): void {
        try {
            getIo().emit('deployment_status', {
                redirectorId,
                status,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            // Socket.IO not available
        }
    }
}

// Singleton instance
export const redirectorService = new RedirectorService();

// Export class for testing
export { RedirectorService };
