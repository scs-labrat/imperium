-- CreateTable
CREATE TABLE "McpConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "command" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);
