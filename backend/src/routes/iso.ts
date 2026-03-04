import { Router } from 'express';
import {
    // Scenario endpoints
    createScenario,
    getScenario,
    updateScenario,
    deleteScenario,
    listScenarios,
    compileScenario,
    getCompiledScenario,
    // Exercise endpoints
    createExercise,
    getExercise,
    listExercises,
    startExercise,
    pauseExercise,
    resumeExercise,
    endExercise,
    // Runtime endpoints
    switchRole,
    setTimeMode,
    advanceTime,
    releaseInject,
    getDueInjects,
    // Decision & Evidence endpoints
    recordDecision,
    accessEvidence,
    getEvidenceForRole,
    // Export/Import endpoints
    exportExercise,
    importExercise,
    generateReport,
} from '../controllers/isoController.js';

const router = Router();

// =========================================================================
// SCENARIO ROUTES
// =========================================================================

// List all scenarios
router.get('/scenarios', listScenarios);

// Create new scenario
router.post('/scenarios', createScenario);

// Get scenario by ID
router.get('/scenarios/:id', getScenario);

// Update scenario
router.put('/scenarios/:id', updateScenario);

// Delete scenario
router.delete('/scenarios/:id', deleteScenario);

// Compile scenario (LLM-powered)
router.post('/scenarios/:id/compile', compileScenario);

// Get compiled scenario
router.get('/scenarios/:id/compiled', getCompiledScenario);

// =========================================================================
// EXERCISE ROUTES
// =========================================================================

// List all exercises
router.get('/exercises', listExercises);

// Create new exercise
router.post('/exercises', createExercise);

// Import exercise from JSON
router.post('/exercises/import', importExercise);

// Get exercise by ID
router.get('/exercises/:id', getExercise);

// Start exercise
router.post('/exercises/:id/start', startExercise);

// Pause exercise
router.post('/exercises/:id/pause', pauseExercise);

// Resume exercise
router.post('/exercises/:id/resume', resumeExercise);

// End exercise
router.post('/exercises/:id/end', endExercise);

// =========================================================================
// RUNTIME ROUTES
// =========================================================================

// Switch role
router.post('/exercises/:id/role', switchRole);

// Set time mode
router.post('/exercises/:id/time-mode', setTimeMode);

// Advance time manually
router.post('/exercises/:id/advance-time', advanceTime);

// Release inject
router.post('/exercises/:id/release-inject', releaseInject);

// Get due injects
router.get('/exercises/:id/due-injects', getDueInjects);

// =========================================================================
// DECISION & EVIDENCE ROUTES
// =========================================================================

// Record decision
router.post('/exercises/:id/decisions', recordDecision);

// Get evidence for role
router.get('/exercises/:id/evidence', getEvidenceForRole);

// Access specific evidence (marks as accessed)
router.post('/exercises/:id/evidence/:evidenceId/access', accessEvidence);

// =========================================================================
// EXPORT / IMPORT / REPORT ROUTES
// =========================================================================

// Export exercise
router.get('/exercises/:id/export', exportExercise);

// Generate report
router.get('/exercises/:id/report', generateReport);

export default router;
