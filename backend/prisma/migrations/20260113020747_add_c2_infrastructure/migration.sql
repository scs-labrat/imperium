-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "arguments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "output" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "completedAt" DATETIME,
    "createdBy" TEXT,
    CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "lastCheckIn" DATETIME NOT NULL,
    "checkInCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EncryptionKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "keyData" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "RedirectorDeployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "redirectorId" TEXT NOT NULL,
    "cloudProvider" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "vmSize" TEXT NOT NULL,
    "publicIp" TEXT,
    "overlayIp" TEXT,
    "terraformState" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHealthCheck" DATETIME,
    CONSTRAINT "RedirectorDeployment_redirectorId_fkey" FOREIGN KEY ("redirectorId") REFERENCES "Redirector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OverlayNetwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subnet" TEXT NOT NULL,
    "caKey" TEXT,
    "caCert" TEXT,
    "serverKey" TEXT,
    "serverPubKey" TEXT,
    "listenPort" INTEGER,
    "config" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RedirectorOverlayConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "redirectorId" TEXT NOT NULL,
    "overlayNetworkId" TEXT NOT NULL,
    "overlayIp" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "certificate" TEXT,
    "config" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedirectorOverlayConfig_redirectorId_fkey" FOREIGN KEY ("redirectorId") REFERENCES "Redirector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RedirectorOverlayConfig_overlayNetworkId_fkey" FOREIGN KEY ("overlayNetworkId") REFERENCES "OverlayNetwork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RedirectorRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listenerId" TEXT NOT NULL,
    "hops" TEXT NOT NULL,
    "forwardingMethod" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedirectorRoute_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Listener" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SshKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "passphrase" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LlmConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Redirector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overlayIp" TEXT,
    "sshUser" TEXT,
    "sshKeyId" TEXT,
    "forwardPort" INTEGER,
    "upstreamId" TEXT,
    CONSTRAINT "Redirector_upstreamId_fkey" FOREIGN KEY ("upstreamId") REFERENCES "Redirector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Redirector" ("id", "ip", "name", "status", "tier", "type") SELECT "id", "ip", "name", "status", "tier", "type" FROM "Redirector";
DROP TABLE "Redirector";
ALTER TABLE "new_Redirector" RENAME TO "Redirector";
CREATE TABLE "new_SiemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "url" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL,
    "verifyTls" BOOLEAN NOT NULL DEFAULT true,
    "indexPattern" TEXT NOT NULL DEFAULT 'logs-*',
    "cloudId" TEXT
);
INSERT INTO "new_SiemConfig" ("apiKey", "connected", "id", "url") SELECT "apiKey", "connected", "id", "url" FROM "SiemConfig";
DROP TABLE "SiemConfig";
ALTER TABLE "new_SiemConfig" RENAME TO "SiemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AgentSession_agentId_key" ON "AgentSession"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "RedirectorDeployment_redirectorId_key" ON "RedirectorDeployment"("redirectorId");

-- CreateIndex
CREATE UNIQUE INDEX "RedirectorOverlayConfig_redirectorId_key" ON "RedirectorOverlayConfig"("redirectorId");
