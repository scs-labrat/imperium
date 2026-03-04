import { EventEmitter } from 'events';
import type {
    ExerciseState,
    TimeMode,
    Inject,
    Decision,
    BranchingRule,
    BranchCondition,
} from '../../types/iso.js';
import {
    TimeMode as TimeModeEnum,
    ExerciseStatus,
} from '../../types/iso.js';
import { isoService } from './ISOService.js';

interface RuntimeState {
    exerciseId: string;
    intervalId: NodeJS.Timeout | null;
    lastTickTime: number;
    accumulatedTime: number;
}

/**
 * RuntimeEngineService handles time orchestration for ISO exercises.
 * It manages:
 * - Time progression in different modes (real-time, accelerated, manual)
 * - Automatic inject release based on schedule
 * - Branching logic evaluation based on decisions
 * - Event broadcasting for real-time updates
 */
class RuntimeEngineService extends EventEmitter {
    private runtimes: Map<string, RuntimeState> = new Map();

    // Time multipliers for different modes (using enum string values)
    private readonly TIME_MULTIPLIERS: Record<string, number> = {
        [TimeModeEnum.REAL_TIME]: 1,
        [TimeModeEnum.ACCELERATED_2X]: 2,
        [TimeModeEnum.ACCELERATED_5X]: 5,
        [TimeModeEnum.ACCELERATED_10X]: 10,
        [TimeModeEnum.MANUAL]: 0, // Manual mode doesn't auto-advance
    };

    // Tick interval in milliseconds (1 second for smooth updates)
    private readonly TICK_INTERVAL_MS = 1000;

    /**
     * Start time orchestration for an exercise.
     * This begins the time progression loop and handles inject auto-release.
     */
    startTimeOrchestration(exerciseId: string): void {
        // Check if already running
        if (this.runtimes.has(exerciseId)) {
            console.log(`Runtime already exists for exercise ${exerciseId}`);
            return;
        }

        const exercise = isoService.getExercise(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise ${exerciseId} not found`);
        }

        const runtime: RuntimeState = {
            exerciseId,
            intervalId: null,
            lastTickTime: Date.now(),
            accumulatedTime: 0,
        };

        // Only start the interval if not in manual mode
        if (exercise.timeMode !== TimeModeEnum.MANUAL) {
            runtime.intervalId = setInterval(
                () => this.tick(exerciseId),
                this.TICK_INTERVAL_MS
            );
        }

        this.runtimes.set(exerciseId, runtime);
        this.emit('orchestration:started', { exerciseId });
        console.log(`Started time orchestration for exercise ${exerciseId}`);
    }

    /**
     * Pause time orchestration for an exercise.
     */
    pauseTimeOrchestration(exerciseId: string): void {
        const runtime = this.runtimes.get(exerciseId);
        if (!runtime) {
            return;
        }

        if (runtime.intervalId) {
            clearInterval(runtime.intervalId);
            runtime.intervalId = null;
        }

        this.emit('orchestration:paused', { exerciseId });
        console.log(`Paused time orchestration for exercise ${exerciseId}`);
    }

    /**
     * Resume time orchestration for an exercise.
     */
    resumeTimeOrchestration(exerciseId: string): void {
        const runtime = this.runtimes.get(exerciseId);
        if (!runtime) {
            this.startTimeOrchestration(exerciseId);
            return;
        }

        const exercise = isoService.getExercise(exerciseId);
        if (!exercise || exercise.timeMode === TimeModeEnum.MANUAL) {
            return;
        }

        if (!runtime.intervalId) {
            runtime.lastTickTime = Date.now();
            runtime.intervalId = setInterval(
                () => this.tick(exerciseId),
                this.TICK_INTERVAL_MS
            );
        }

        this.emit('orchestration:resumed', { exerciseId });
        console.log(`Resumed time orchestration for exercise ${exerciseId}`);
    }

    /**
     * Stop and clean up time orchestration for an exercise.
     */
    stopTimeOrchestration(exerciseId: string): void {
        const runtime = this.runtimes.get(exerciseId);
        if (!runtime) {
            return;
        }

        if (runtime.intervalId) {
            clearInterval(runtime.intervalId);
        }

        this.runtimes.delete(exerciseId);
        this.emit('orchestration:stopped', { exerciseId });
        console.log(`Stopped time orchestration for exercise ${exerciseId}`);
    }

    /**
     * Change the time mode for an exercise.
     */
    setTimeMode(exerciseId: string, mode: TimeMode): void {
        const runtime = this.runtimes.get(exerciseId);
        if (!runtime) {
            return;
        }

        // If switching to manual, stop the interval
        if (mode === TimeModeEnum.MANUAL && runtime.intervalId) {
            clearInterval(runtime.intervalId);
            runtime.intervalId = null;
        }
        // If switching from manual to another mode, start the interval
        else if (mode !== TimeModeEnum.MANUAL && !runtime.intervalId) {
            runtime.lastTickTime = Date.now();
            runtime.intervalId = setInterval(
                () => this.tick(exerciseId),
                this.TICK_INTERVAL_MS
            );
        }

        this.emit('time-mode:changed', { exerciseId, mode });
    }

    /**
     * Manually advance time by a specified number of minutes.
     * Only works in manual mode.
     */
    manualAdvanceTime(exerciseId: string, minutes: number): ExerciseState | null {
        const exercise = isoService.getExercise(exerciseId);
        if (!exercise || exercise.timeMode !== TimeModeEnum.MANUAL) {
            return null;
        }

        // Use the ISO service to advance time
        const updated = isoService.advanceTime(exerciseId, minutes);

        if (updated) {
            // Check for injects to release after time advance
            const releasedInjects = this.checkInjectSchedule(exerciseId);
            if (releasedInjects.length > 0) {
                this.emit('injects:released', { exerciseId, injects: releasedInjects });
            }

            this.emit('time:advanced', {
                exerciseId,
                scenarioTimeMinutes: updated.scenarioTimeMinutes,
                advancedBy: minutes
            });
        }

        return updated;
    }

    /**
     * Internal tick function called every second.
     * Handles time progression and inject release.
     */
    private tick(exerciseId: string): void {
        const runtime = this.runtimes.get(exerciseId);
        if (!runtime) {
            return;
        }

        const exercise = isoService.getExercise(exerciseId);
        if (!exercise || exercise.status !== ExerciseStatus.RUNNING) {
            return;
        }

        const now = Date.now();
        const realElapsed = now - runtime.lastTickTime;
        runtime.lastTickTime = now;

        // Calculate exercise time based on multiplier
        const multiplier = this.TIME_MULTIPLIERS[exercise.timeMode] || 0;
        if (multiplier === 0) {
            return; // Manual mode
        }

        // Convert real milliseconds to exercise minutes
        const exerciseMilliseconds = realElapsed * multiplier;
        runtime.accumulatedTime += exerciseMilliseconds;

        // Only update when at least 1 minute has passed in exercise time
        const accumulatedMinutes = Math.floor(runtime.accumulatedTime / 60000);
        if (accumulatedMinutes >= 1) {
            runtime.accumulatedTime -= accumulatedMinutes * 60000;

            // Advance the exercise time
            const updated = isoService.advanceTime(exerciseId, accumulatedMinutes);

            if (updated) {
                // Check for injects to release
                const releasedInjects = this.checkInjectSchedule(exerciseId);
                if (releasedInjects.length > 0) {
                    this.emit('injects:released', { exerciseId, injects: releasedInjects });
                }

                // Broadcast time update
                this.emit('time:update', {
                    exerciseId,
                    scenarioTimeMinutes: updated.scenarioTimeMinutes
                });

                // Check if exercise should end
                const duration = updated.compiledScenario.definition.exerciseDurationMinutes;
                if (updated.scenarioTimeMinutes >= duration) {
                    isoService.endExercise(exerciseId);
                    this.stopTimeOrchestration(exerciseId);
                    this.emit('exercise:completed', { exerciseId });
                }
            }
        }
    }

    /**
     * Check which injects should be released based on current exercise time.
     * Returns the list of newly released injects.
     */
    checkInjectSchedule(exerciseId: string): Inject[] {
        const exercise = isoService.getExercise(exerciseId);
        if (!exercise) {
            return [];
        }

        const releasedInjects: Inject[] = [];
        const allInjects = exercise.compiledScenario.injects;
        const currentTime = exercise.scenarioTimeMinutes;

        for (const inject of allInjects) {
            // Skip already released injects
            if (exercise.releasedInjectIds.includes(inject.id)) {
                continue;
            }

            // Check if inject should be released based on schedule
            if (inject.scheduledTimeMinutes <= currentTime) {
                // Check branching conditions
                if (this.evaluateBranchCondition(exercise, inject)) {
                    const released = isoService.releaseInject(exerciseId, inject.id);
                    if (released) {
                        releasedInjects.push(inject);
                        this.broadcastInjectRelease(exerciseId, inject);
                    }
                }
            }
        }

        return releasedInjects;
    }

    /**
     * Evaluate branching conditions to determine if an inject should be released.
     */
    private evaluateBranchCondition(exercise: ExerciseState, inject: Inject): boolean {
        // If no branch condition, always release
        if (!inject.branchCondition) {
            return true;
        }

        // Evaluate the inject's branch condition directly
        return this.evaluateBranchConditionType(exercise, inject.branchCondition);
    }

    /**
     * Evaluate a branch condition against exercise state.
     */
    private evaluateBranchConditionType(exercise: ExerciseState, condition: BranchCondition | undefined): boolean {
        if (!condition) return true;

        switch (condition.type) {
            case 'decision': {
                // Check if a specific decision was made
                if (condition.triggerOptionId && condition.triggerDecisionId) {
                    const decision = exercise.decisions.find(
                        d => d.expectedDecisionId === condition.triggerDecisionId &&
                             d.selectedOptionId === condition.triggerOptionId
                    );
                    return !!decision;
                }
                return false;
            }
            case 'time': {
                // Check if a specific time has passed
                if (condition.triggerTimeMinutes !== undefined) {
                    return exercise.scenarioTimeMinutes >= condition.triggerTimeMinutes;
                }
                return true;
            }
            case 'evidence_access': {
                // Check if specific evidence has been accessed
                if (condition.triggerEvidenceId) {
                    return exercise.accessedEvidenceIds.includes(condition.triggerEvidenceId);
                }
                return true;
            }
            case 'cumulative_score': {
                // Check cumulative score threshold
                if (condition.triggerScoreThreshold !== undefined) {
                    const currentScore = exercise.liveScoring?.totalScore || 0;
                    return currentScore >= condition.triggerScoreThreshold;
                }
                return true;
            }
            default:
                return true;
        }
    }

    /**
     * Evaluate a branching rule against exercise state.
     */
    private evaluateBranchingRule(exercise: ExerciseState, rule: BranchingRule): boolean {
        return this.evaluateBranchConditionType(exercise, rule.condition);
    }

    /**
     * Check branching conditions after a decision is made.
     * Returns injects that should be released as a result.
     */
    checkBranchConditions(exerciseId: string, decision: Decision): Inject[] {
        const exercise = isoService.getExercise(exerciseId);
        if (!exercise) {
            return [];
        }

        const triggeredInjects: Inject[] = [];
        const branchingRules = exercise.compiledScenario.branchingLogic || [];

        // Find rules triggered by this decision
        const triggeredRules = branchingRules.filter(rule => {
            if (rule.triggerType !== 'decision') return false;
            const condition = rule.condition;
            return condition.triggerDecisionId === decision.expectedDecisionId &&
                   condition.triggerOptionId === decision.selectedOptionId;
        });

        // Process each triggered rule
        for (const rule of triggeredRules) {
            // Release consequence injects
            for (const targetInjectId of rule.consequenceInjectIds) {
                const targetInject = exercise.compiledScenario.injects.find(
                    i => i.id === targetInjectId
                );

                if (targetInject && !exercise.releasedInjectIds.includes(targetInject.id)) {
                    const released = isoService.releaseInject(exerciseId, targetInject.id);
                    if (released) {
                        triggeredInjects.push(targetInject);
                        this.broadcastInjectRelease(exerciseId, targetInject);
                    }
                }
            }
        }

        return triggeredInjects;
    }

    /**
     * Broadcast an inject release event.
     */
    broadcastInjectRelease(exerciseId: string, inject: Inject): void {
        this.emit('inject:released', {
            exerciseId,
            inject,
            timestamp: new Date().toISOString()
        });
        console.log(`Inject released: ${inject.title} (T+${inject.scheduledTimeMinutes})`);
    }

    /**
     * Broadcast a time update event.
     */
    broadcastTimeUpdate(exerciseId: string, scenarioTimeMinutes: number): void {
        this.emit('time:update', {
            exerciseId,
            scenarioTimeMinutes,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get the current runtime state for an exercise.
     */
    getRuntimeState(exerciseId: string): RuntimeState | undefined {
        return this.runtimes.get(exerciseId);
    }

    /**
     * Check if an exercise has active orchestration.
     */
    isOrchestrationActive(exerciseId: string): boolean {
        return this.runtimes.has(exerciseId);
    }
}

export const runtimeEngine = new RuntimeEngineService();
export default RuntimeEngineService;
