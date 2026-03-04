import { Request, Response } from 'express';
import { isoService, scenarioCompilerService } from '../services/iso/index.js';
import { ISORole, TimeMode, RecordDecisionRequest } from '../types/iso.js';

/**
 * ISO Controller - Handles all Incident Simulation Orchestrator API endpoints
 */

// =========================================================================
// SCENARIO ENDPOINTS
// =========================================================================

/**
 * Create a new scenario definition
 * POST /api/iso/scenarios
 */
export async function createScenario(req: Request, res: Response): Promise<void> {
    try {
        const scenario = isoService.createScenario(req.body);
        res.status(201).json({
            success: true,
            data: scenario,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get scenario by ID
 * GET /api/iso/scenarios/:id
 */
export async function getScenario(req: Request, res: Response): Promise<void> {
    try {
        const scenario = isoService.getScenario(req.params.id);
        if (!scenario) {
            res.status(404).json({
                success: false,
                error: 'Scenario not found',
            });
            return;
        }
        res.json({
            success: true,
            data: scenario,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Update scenario
 * PUT /api/iso/scenarios/:id
 */
export async function updateScenario(req: Request, res: Response): Promise<void> {
    try {
        const scenario = isoService.updateScenario(req.params.id, req.body);
        res.json({
            success: true,
            data: scenario,
        });
    } catch (error: any) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Delete scenario
 * DELETE /api/iso/scenarios/:id
 */
export async function deleteScenario(req: Request, res: Response): Promise<void> {
    try {
        isoService.deleteScenario(req.params.id);
        res.json({
            success: true,
            message: 'Scenario deleted',
        });
    } catch (error: any) {
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * List all scenarios
 * GET /api/iso/scenarios
 */
export async function listScenarios(req: Request, res: Response): Promise<void> {
    try {
        const scenarios = isoService.listScenarios();
        res.json({
            success: true,
            data: scenarios,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Compile scenario (LLM-powered generation)
 * POST /api/iso/scenarios/:id/compile
 */
export async function compileScenario(req: Request, res: Response): Promise<void> {
    try {
        const { modelName } = req.body;
        if (!modelName) {
            res.status(400).json({
                success: false,
                error: 'modelName is required',
            });
            return;
        }

        const compiled = await scenarioCompilerService.compile(req.params.id, modelName);
        res.json({
            success: true,
            data: compiled,
        });
    } catch (error: any) {
        console.error('[ISO] Compilation error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get compiled scenario
 * GET /api/iso/scenarios/:id/compiled
 */
export async function getCompiledScenario(req: Request, res: Response): Promise<void> {
    try {
        const compiled = isoService.getCompiledScenario(req.params.id);
        if (!compiled) {
            res.status(404).json({
                success: false,
                error: 'Compiled scenario not found. Please compile the scenario first.',
            });
            return;
        }
        res.json({
            success: true,
            data: compiled,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

// =========================================================================
// EXERCISE ENDPOINTS
// =========================================================================

/**
 * Create exercise from compiled scenario
 * POST /api/iso/exercises
 */
export async function createExercise(req: Request, res: Response): Promise<void> {
    try {
        const { scenarioId } = req.body;
        if (!scenarioId) {
            res.status(400).json({
                success: false,
                error: 'scenarioId is required',
            });
            return;
        }
        const exercise = isoService.createExercise(scenarioId);
        res.status(201).json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get exercise by ID
 * GET /api/iso/exercises/:id
 */
export async function getExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.getExercise(req.params.id);
        if (!exercise) {
            res.status(404).json({
                success: false,
                error: 'Exercise not found',
            });
            return;
        }
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * List all exercises
 * GET /api/iso/exercises
 */
export async function listExercises(req: Request, res: Response): Promise<void> {
    try {
        const exercises = isoService.listExercises();
        res.json({
            success: true,
            data: exercises,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Start exercise
 * POST /api/iso/exercises/:id/start
 */
export async function startExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.startExercise(req.params.id);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Pause exercise
 * POST /api/iso/exercises/:id/pause
 */
export async function pauseExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.pauseExercise(req.params.id);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Resume exercise
 * POST /api/iso/exercises/:id/resume
 */
export async function resumeExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.resumeExercise(req.params.id);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * End exercise
 * POST /api/iso/exercises/:id/end
 */
export async function endExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.endExercise(req.params.id);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

// =========================================================================
// RUNTIME ENDPOINTS
// =========================================================================

/**
 * Switch role in exercise
 * POST /api/iso/exercises/:id/role
 */
export async function switchRole(req: Request, res: Response): Promise<void> {
    try {
        const { role } = req.body;
        if (!role || !Object.values(ISORole).includes(role)) {
            res.status(400).json({
                success: false,
                error: 'Valid role is required',
            });
            return;
        }
        const exercise = isoService.switchRole(req.params.id, role);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Set time mode
 * POST /api/iso/exercises/:id/time-mode
 */
export async function setTimeMode(req: Request, res: Response): Promise<void> {
    try {
        const { mode } = req.body;
        if (!mode || !Object.values(TimeMode).includes(mode)) {
            res.status(400).json({
                success: false,
                error: 'Valid time mode is required',
            });
            return;
        }
        const exercise = isoService.setTimeMode(req.params.id, mode);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Advance time manually
 * POST /api/iso/exercises/:id/advance-time
 */
export async function advanceTime(req: Request, res: Response): Promise<void> {
    try {
        const { minutes } = req.body;
        if (typeof minutes !== 'number' || minutes < 0) {
            res.status(400).json({
                success: false,
                error: 'Valid minutes value is required',
            });
            return;
        }
        const exercise = isoService.advanceTime(req.params.id, minutes);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Release an inject
 * POST /api/iso/exercises/:id/release-inject
 */
export async function releaseInject(req: Request, res: Response): Promise<void> {
    try {
        const { injectId } = req.body;
        if (!injectId) {
            res.status(400).json({
                success: false,
                error: 'injectId is required',
            });
            return;
        }
        const exercise = isoService.releaseInject(req.params.id, injectId);
        res.json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get due injects
 * GET /api/iso/exercises/:id/due-injects
 */
export async function getDueInjects(req: Request, res: Response): Promise<void> {
    try {
        const injects = isoService.getDueInjects(req.params.id);
        res.json({
            success: true,
            data: injects,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

// =========================================================================
// DECISION & EVIDENCE ENDPOINTS
// =========================================================================

/**
 * Record a decision
 * POST /api/iso/exercises/:id/decisions
 */
export async function recordDecision(req: Request, res: Response): Promise<void> {
    try {
        const decision = isoService.recordDecision(req.params.id, req.body);
        res.status(201).json({
            success: true,
            data: decision,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Access evidence (marks as accessed)
 * POST /api/iso/exercises/:id/evidence/:evidenceId/access
 */
export async function accessEvidence(req: Request, res: Response): Promise<void> {
    try {
        const evidence = isoService.accessEvidence(req.params.id, req.params.evidenceId);
        if (!evidence) {
            res.status(404).json({
                success: false,
                error: 'Evidence not found',
            });
            return;
        }
        res.json({
            success: true,
            data: evidence,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get evidence for current role
 * GET /api/iso/exercises/:id/evidence
 */
export async function getEvidenceForRole(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.getExercise(req.params.id);
        if (!exercise) {
            res.status(404).json({
                success: false,
                error: 'Exercise not found',
            });
            return;
        }
        const role = (req.query.role as ISORole) || exercise.currentRole;
        const evidence = isoService.getEvidenceForRole(req.params.id, role);
        res.json({
            success: true,
            data: evidence,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

// =========================================================================
// EXPORT / IMPORT ENDPOINTS
// =========================================================================

/**
 * Export exercise to JSON
 * GET /api/iso/exercises/:id/export
 */
export async function exportExercise(req: Request, res: Response): Promise<void> {
    try {
        const exportData = isoService.exportExercise(req.params.id);
        res.json({
            success: true,
            data: exportData,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Import exercise from JSON
 * POST /api/iso/exercises/import
 */
export async function importExercise(req: Request, res: Response): Promise<void> {
    try {
        const exercise = isoService.importExercise(req.body);
        res.status(201).json({
            success: true,
            data: exercise,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Generate post-exercise report
 * GET /api/iso/exercises/:id/report
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
    try {
        const report = await isoService.generateReport(req.params.id);
        res.json({
            success: true,
            data: report,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
}
