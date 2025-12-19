-- CreateTable
CREATE TABLE "Listener" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "redirectorId" TEXT,
    "hostHeader" TEXT
);

-- CreateTable
CREATE TABLE "Redirector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "os" TEXT NOT NULL,
    "osVersion" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "privileges" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "externalIp" TEXT NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "firstSeen" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "listener" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "processName" TEXT NOT NULL,
    "processInjectionTarget" TEXT
);

-- CreateTable
CREATE TABLE "Loot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "confidence" INTEGER,
    "sourcePath" TEXT
);

-- CreateTable
CREATE TABLE "SiemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "url" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "SiemRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL
);
