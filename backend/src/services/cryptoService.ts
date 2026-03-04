import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * CryptoService - Handles all encryption operations for the C2 framework
 * - RSA keypair generation and management
 * - AES-256-GCM encryption/decryption for agent communication
 * - HMAC-SHA256 for message authentication
 */

interface EncryptedMessage {
    iv: string;      // Base64 encoded IV
    data: string;    // Base64 encoded encrypted data
    tag: string;     // Base64 encoded auth tag
}

interface SecureMessage {
    timestamp: number;
    nonce: string;
    data: string;        // Encrypted payload
    signature: string;   // HMAC-SHA256 signature
}

class CryptoService {
    private serverPrivateKey: crypto.KeyObject | null = null;
    private serverPublicKey: crypto.KeyObject | null = null;
    private initialized: boolean = false;

    /**
     * Initialize the crypto service - generates or loads server keypair
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        // Try to load existing keys from database
        const privateKeyRecord = await prisma.encryptionKey.findFirst({
            where: { type: 'server_private' }
        });

        const publicKeyRecord = await prisma.encryptionKey.findFirst({
            where: { type: 'server_public' }
        });

        if (privateKeyRecord && publicKeyRecord) {
            // Load existing keys
            this.serverPrivateKey = crypto.createPrivateKey({
                key: Buffer.from(privateKeyRecord.keyData, 'base64'),
                format: 'der',
                type: 'pkcs8'
            });

            this.serverPublicKey = crypto.createPublicKey({
                key: Buffer.from(publicKeyRecord.keyData, 'base64'),
                format: 'der',
                type: 'spki'
            });

            console.log('[CryptoService] Loaded existing server keypair');
        } else {
            // Generate new keypair
            await this.generateServerKeypair();
            console.log('[CryptoService] Generated new server keypair');
        }

        this.initialized = true;
    }

    /**
     * Generate and store a new RSA-2048 server keypair
     */
    private async generateServerKeypair(): Promise<void> {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        });

        // Store keys in database
        await prisma.encryptionKey.createMany({
            data: [
                {
                    type: 'server_private',
                    keyData: (privateKey as Buffer).toString('base64'),
                    algorithm: 'RSA-2048'
                },
                {
                    type: 'server_public',
                    keyData: (publicKey as Buffer).toString('base64'),
                    algorithm: 'RSA-2048'
                }
            ]
        });

        // Load the keys into memory
        this.serverPrivateKey = crypto.createPrivateKey({
            key: privateKey,
            format: 'der',
            type: 'pkcs8'
        });

        this.serverPublicKey = crypto.createPublicKey({
            key: publicKey,
            format: 'der',
            type: 'spki'
        });
    }

    /**
     * Get the server's public key in base64 format (for embedding in agents)
     */
    async getPublicKeyBase64(): Promise<string> {
        await this.init();
        const exported = this.serverPublicKey!.export({
            type: 'spki',
            format: 'der'
        });
        return (exported as Buffer).toString('base64');
    }

    /**
     * Get the server's public key in PEM format
     */
    async getPublicKeyPem(): Promise<string> {
        await this.init();
        const exported = this.serverPublicKey!.export({
            type: 'spki',
            format: 'pem'
        });
        return exported as string;
    }

    /**
     * Decrypt a session key that was encrypted with the server's public key
     * Used during agent registration when agent sends its AES session key
     */
    async decryptSessionKey(encryptedKey: Buffer): Promise<Buffer> {
        await this.init();
        return crypto.privateDecrypt(
            {
                key: this.serverPrivateKey!,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            encryptedKey
        );
    }

    /**
     * Decrypt a base64-encoded session key
     */
    async decryptSessionKeyBase64(encryptedKeyBase64: string): Promise<Buffer> {
        const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');
        return this.decryptSessionKey(encryptedKey);
    }

    /**
     * Encrypt data with AES-256-GCM using a session key
     */
    encryptWithSessionKey(data: object | string, sessionKey: Buffer): EncryptedMessage {
        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);

        const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('base64'),
            data: encrypted,
            tag: authTag.toString('base64')
        };
    }

    /**
     * Decrypt data with AES-256-GCM using a session key
     */
    decryptWithSessionKey(encrypted: EncryptedMessage, sessionKey: Buffer): string {
        const iv = Buffer.from(encrypted.iv, 'base64');
        const authTag = Buffer.from(encrypted.tag, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Decrypt and parse JSON data
     */
    decryptWithSessionKeyJson<T>(encrypted: EncryptedMessage, sessionKey: Buffer): T {
        const decrypted = this.decryptWithSessionKey(encrypted, sessionKey);
        return JSON.parse(decrypted) as T;
    }

    /**
     * Generate HMAC-SHA256 signature for message authentication
     */
    signMessage(data: string, sessionKey: Buffer): string {
        const hmac = crypto.createHmac('sha256', sessionKey);
        hmac.update(data);
        return hmac.digest('base64');
    }

    /**
     * Verify HMAC-SHA256 signature
     */
    verifySignature(data: string, signature: string, sessionKey: Buffer): boolean {
        const expectedSignature = this.signMessage(data, sessionKey);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64')
        );
    }

    /**
     * Create a secure message with timestamp, nonce, and signature
     */
    createSecureMessage(data: object, sessionKey: Buffer): SecureMessage {
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('base64');
        const encrypted = this.encryptWithSessionKey(data, sessionKey);
        const encryptedStr = JSON.stringify(encrypted);

        const signatureData = `${timestamp}:${nonce}:${encryptedStr}`;
        const signature = this.signMessage(signatureData, sessionKey);

        return {
            timestamp,
            nonce,
            data: encryptedStr,
            signature
        };
    }

    /**
     * Verify and decrypt a secure message
     */
    verifyAndDecryptSecureMessage<T>(
        message: SecureMessage,
        sessionKey: Buffer,
        maxAgeMs: number = 300000 // 5 minutes default
    ): T {
        // Verify timestamp (prevent replay attacks)
        const age = Date.now() - message.timestamp;
        if (age > maxAgeMs) {
            throw new Error('Message expired');
        }

        // Verify signature
        const signatureData = `${message.timestamp}:${message.nonce}:${message.data}`;
        if (!this.verifySignature(signatureData, message.signature, sessionKey)) {
            throw new Error('Invalid signature');
        }

        // Decrypt data
        const encrypted = JSON.parse(message.data) as EncryptedMessage;
        return this.decryptWithSessionKeyJson<T>(encrypted, sessionKey);
    }

    /**
     * Generate a random AES-256 session key
     */
    generateSessionKey(): Buffer {
        return crypto.randomBytes(32); // 256 bits
    }

    /**
     * Generate a random agent ID
     */
    generateAgentId(): string {
        return crypto.randomUUID();
    }

    /**
     * Hash a value using SHA-256
     */
    sha256(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate a secure random hex string
     */
    randomHex(bytes: number = 16): string {
        return crypto.randomBytes(bytes).toString('hex');
    }
}

// Singleton instance
export const cryptoService = new CryptoService();

// Export class for testing
export { CryptoService };
