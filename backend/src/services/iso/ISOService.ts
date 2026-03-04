import { v4 as uuidv4 } from 'uuid';
import type {
    ScenarioDefinition,
    CompiledScenario,
    ExerciseState,
    Decision,
    SyntheticEvidence,
    ExerciseExport,
    PostExerciseReport,
    Inject,
    RecordDecisionRequest,
} from '../../types/iso.js';
import {
    ExerciseStatus,
    ISORole,
    TimeMode,
} from '../../types/iso.js';

/**
 * ISOService - Main orchestrator for Incident Simulation Orchestrator
 * Manages scenarios, exercises, and runtime state with in-memory storage
 */
class ISOService {
    // In-memory storage
    private scenarios: Map<string, ScenarioDefinition> = new Map();
    private compiledScenarios: Map<string, CompiledScenario> = new Map();
    private exercises: Map<string, ExerciseState> = new Map();

    // =========================================================================
    // SCENARIO MANAGEMENT
    // =========================================================================

    /**
     * Create a new scenario definition
     */
    createScenario(definition: Omit<ScenarioDefinition, 'id' | 'createdAt'>): ScenarioDefinition {
        const scenario: ScenarioDefinition = {
            ...definition,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
        };

        this.scenarios.set(scenario.id, scenario);
        return scenario;
    }

    /**
     * Get a scenario by ID
     */
    getScenario(id: string): ScenarioDefinition | undefined {
        return this.scenarios.get(id);
    }

    /**
     * Update a scenario definition
     */
    updateScenario(id: string, updates: Partial<ScenarioDefinition>): ScenarioDefinition {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            throw new Error(`Scenario not found: ${id}`);
        }

        const updated: ScenarioDefinition = {
            ...scenario,
            ...updates,
            id: scenario.id, // Preserve original ID
            updatedAt: new Date().toISOString(),
        };

        this.scenarios.set(id, updated);
        return updated;
    }

    /**
     * Delete a scenario
     */
    deleteScenario(id: string): void {
        if (!this.scenarios.has(id)) {
            throw new Error(`Scenario not found: ${id}`);
        }
        this.scenarios.delete(id);
        // Also remove compiled version if exists
        this.compiledScenarios.delete(id);
    }

    /**
     * List all scenarios
     */
    listScenarios(): ScenarioDefinition[] {
        return Array.from(this.scenarios.values());
    }

    /**
     * Get compiled scenario
     */
    getCompiledScenario(scenarioId: string): CompiledScenario | undefined {
        return this.compiledScenarios.get(scenarioId);
    }

    /**
     * Store compiled scenario (called by ScenarioCompilerService)
     */
    storeCompiledScenario(scenarioId: string, compiled: CompiledScenario): void {
        this.compiledScenarios.set(scenarioId, compiled);
    }

    // =========================================================================
    // EXERCISE LIFECYCLE
    // =========================================================================

    /**
     * Create a new exercise from a compiled scenario
     */
    createExercise(scenarioId: string, userName: string = 'Operator'): ExerciseState {
        const compiled = this.compiledScenarios.get(scenarioId);
        if (!compiled) {
            throw new Error(`Compiled scenario not found: ${scenarioId}. Please compile the scenario first.`);
        }

        const exerciseId = uuidv4();
        const exercise: ExerciseState = {
            id: exerciseId,
            scenarioId,
            compiledScenarioId: compiled.id,
            compiledScenario: compiled,
            status: ExerciseStatus.READY,
            timeMode: TimeMode.REAL_TIME,
            startedAt: undefined,
            pausedAt: undefined,
            endedAt: undefined,
            totalPausedDurationSeconds: 0,
            elapsedTimeSeconds: 0,
            scenarioTimeMinutes: 0,
            currentRole: ISORole.CONTROLLER,
            currentUserName: userName,
            releasedInjectIds: [],
            accessedEvidenceIds: [],
            decisions: [],
            notificationClockStates: {},
            liveScoring: {},
            participants: [{
                id: uuidv4(),
                name: userName,
                role: ISORole.CONTROLLER,
                joinedAt: new Date().toISOString(),
                isActive: true,
                lastActivityAt: new Date().toISOString(),
            }],
        };

        // Initialize notification clock states from compiled scenario
        if (compiled.legalCommsLayer?.notificationClocks) {
            for (const clock of compiled.legalCommsLayer.notificationClocks) {
                exercise.notificationClockStates[clock.id] = { ...clock };
            }
        }

        this.exercises.set(exercise.id, exercise);
        return exercise;
    }

    /**
     * Get exercise by ID
     */
    getExercise(id: string): ExerciseState | undefined {
        return this.exercises.get(id);
    }

    /**
     * Start an exercise
     */
    startExercise(exerciseId: string): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        if (exercise.status !== ExerciseStatus.READY && exercise.status !== ExerciseStatus.PAUSED) {
            throw new Error(`Exercise cannot be started from status: ${exercise.status}`);
        }

        exercise.status = ExerciseStatus.RUNNING;
        exercise.startedAt = exercise.startedAt || new Date().toISOString();
        exercise.pausedAt = undefined;

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Pause an exercise
     */
    pauseExercise(exerciseId: string): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        if (exercise.status !== ExerciseStatus.RUNNING) {
            throw new Error(`Exercise cannot be paused from status: ${exercise.status}`);
        }

        exercise.status = ExerciseStatus.PAUSED;
        exercise.pausedAt = new Date().toISOString();

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Resume a paused exercise
     */
    resumeExercise(exerciseId: string): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        if (exercise.status !== ExerciseStatus.PAUSED) {
            throw new Error(`Exercise cannot be resumed from status: ${exercise.status}`);
        }

        // Calculate paused duration and add to total
        if (exercise.pausedAt) {
            const pausedDuration = (new Date().getTime() - new Date(exercise.pausedAt).getTime()) / 1000;
            exercise.totalPausedDurationSeconds += pausedDuration;
        }

        exercise.status = ExerciseStatus.RUNNING;
        exercise.pausedAt = undefined;

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * End an exercise
     */
    endExercise(exerciseId: string): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        exercise.status = ExerciseStatus.COMPLETED;
        exercise.endedAt = new Date().toISOString();

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * List all exercises
     */
    listExercises(): ExerciseState[] {
        return Array.from(this.exercises.values());
    }

    // =========================================================================
    // RUNTIME OPERATIONS
    // =========================================================================

    /**
     * Switch current role in exercise
     */
    switchRole(exerciseId: string, role: ISORole): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        exercise.currentRole = role;
        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Set time mode
     */
    setTimeMode(exerciseId: string, mode: TimeMode): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        exercise.timeMode = mode;
        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Advance exercise time (for manual mode or time sync)
     */
    advanceTime(exerciseId: string, minutes: number): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        exercise.scenarioTimeMinutes += minutes;
        exercise.elapsedTimeSeconds += minutes * 60;

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Release an inject
     */
    releaseInject(exerciseId: string, injectId: string): ExerciseState {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        // Find the inject
        const inject = exercise.compiledScenario.injects.find(i => i.id === injectId);
        if (!inject) {
            throw new Error(`Inject not found: ${injectId}`);
        }

        // Mark as released
        if (!exercise.releasedInjectIds.includes(injectId)) {
            exercise.releasedInjectIds.push(injectId);
            inject.actualReleaseTime = new Date().toISOString();
        }

        this.exercises.set(exerciseId, exercise);
        return exercise;
    }

    /**
     * Get injects due for release based on elapsed time
     */
    getDueInjects(exerciseId: string): Inject[] {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        return exercise.compiledScenario.injects.filter(inject => {
            // Not already released
            if (exercise.releasedInjectIds.includes(inject.id)) {
                return false;
            }
            // Scheduled time has passed
            return inject.scheduledTimeMinutes <= exercise.scenarioTimeMinutes;
        });
    }

    // =========================================================================
    // DECISIONS & EVIDENCE
    // =========================================================================

    /**
     * Record a decision made during exercise
     */
    recordDecision(exerciseId: string, request: RecordDecisionRequest): Decision {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        const decision: Decision = {
            id: uuidv4(),
            injectId: request.injectId,
            expectedDecisionId: request.expectedDecisionId,
            selectedOptionId: request.selectedOptionId,
            madeBy: {
                role: exercise.currentRole,
                userName: exercise.currentUserName,
            },
            timestamp: new Date().toISOString(),
            scenarioTimeMinutes: exercise.scenarioTimeMinutes,
            evidenceConsideredIds: request.evidenceConsideredIds,
            evidenceIgnoredIds: this.calculateIgnoredEvidence(exercise, request.evidenceConsideredIds),
            timeToDecisionSeconds: 0, // TODO: Calculate from inject release time
            notes: request.notes,
        };

        exercise.decisions.push(decision);
        this.exercises.set(exerciseId, exercise);

        return decision;
    }

    /**
     * Calculate which critical evidence was ignored
     */
    private calculateIgnoredEvidence(exercise: ExerciseState, consideredIds: string[]): string[] {
        const criticalEvidence = exercise.compiledScenario.evidenceLibrary
            .filter(e => e.criticalEvidence)
            .map(e => e.id);

        return criticalEvidence.filter(id => !consideredIds.includes(id) && !exercise.accessedEvidenceIds.includes(id));
    }

    /**
     * Access evidence (marks as accessed for tracking)
     */
    accessEvidence(exerciseId: string, evidenceId: string): SyntheticEvidence | undefined {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        // Find evidence in the evidence library
        const evidence = exercise.compiledScenario.evidenceLibrary.find(e => e.id === evidenceId);

        if (evidence && !exercise.accessedEvidenceIds.includes(evidenceId)) {
            exercise.accessedEvidenceIds.push(evidenceId);
            this.exercises.set(exerciseId, exercise);
        }

        return evidence;
    }

    /**
     * Get all evidence visible to a role
     */
    getEvidenceForRole(exerciseId: string, role: ISORole): SyntheticEvidence[] {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        return exercise.compiledScenario.evidenceLibrary.filter(
            e => e.visibleToRoles.includes(role)
        );
    }

    // =========================================================================
    // EXPORT / IMPORT
    // =========================================================================

    /**
     * Export exercise to JSON
     */
    exportExercise(exerciseId: string, exportedBy: string = 'System'): ExerciseExport {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        const scenario = this.scenarios.get(exercise.scenarioId);
        if (!scenario) {
            throw new Error(`Scenario not found for exercise: ${exerciseId}`);
        }

        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            exportedBy,
            scenarioDefinition: scenario,
            compiledScenario: exercise.compiledScenario,
            exerciseState: exercise,
            postExerciseReport: undefined,
        };
    }

    /**
     * Import exercise from JSON
     */
    importExercise(data: ExerciseExport): ExerciseState {
        // Validate version
        if (!data.version || !data.scenarioDefinition) {
            throw new Error('Invalid export format');
        }

        // Store scenario definition
        const scenarioId = data.scenarioDefinition.id || uuidv4();
        const scenario: ScenarioDefinition = {
            ...data.scenarioDefinition,
            id: scenarioId,
        };
        this.scenarios.set(scenarioId, scenario);

        // Store compiled scenario if present
        if (data.compiledScenario) {
            this.compiledScenarios.set(scenarioId, data.compiledScenario);
        }

        // Restore or create exercise state
        if (data.exerciseState) {
            const exercise: ExerciseState = {
                ...data.exerciseState,
                id: uuidv4(), // New ID for imported exercise
                scenarioId,
            };
            this.exercises.set(exercise.id, exercise);
            return exercise;
        } else if (data.compiledScenario) {
            // Create new exercise from compiled scenario
            return this.createExercise(scenarioId);
        } else {
            throw new Error('Export must contain either exerciseState or compiledScenario');
        }
    }

    // =========================================================================
    // REPORTING (placeholder - full implementation in ScoringService)
    // =========================================================================

    /**
     * Generate post-exercise report placeholder
     */
    async generateReport(exerciseId: string): Promise<PostExerciseReport> {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }

        // Basic report structure - full implementation will be in ScoringService
        const report: PostExerciseReport = {
            exerciseId,
            exerciseName: exercise.compiledScenario.definition.name,
            generatedAt: new Date().toISOString(),
            executiveSummary: 'Report generation pending full implementation.',
            overallAssessment: 'needs_improvement',
            timeline: [],
            decisionLog: [],
            evidenceMap: [],
            scoring: {
                exerciseId,
                totalScore: 0,
                maxPossibleScore: 100,
                percentage: 0,
                passFail: 'fail',
                categoryScores: [],
                metricResults: [],
                driftAnalytics: {
                    escalationDelaySeconds: 0,
                    averageDecisionTimeSeconds: 0,
                    evidenceNeglectRate: 0,
                    safetyBypasses: 0,
                    policyViolations: 0,
                    communicationGaps: 0,
                    missedDeadlines: 0,
                    roleCollaborationScore: 50,
                },
            },
            regulatoryExposure: [],
            controlGaps: [],
            recommendations: [],
            suggestedReruns: [],
        };

        return report;
    }
}

// Singleton instance
export const isoService = new ISOService();

// Export class for testing
export { ISOService };
