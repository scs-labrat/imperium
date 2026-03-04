/**
 * ISO (Incident Simulation Orchestrator) Frontend Service
 * API client for ISO backend endpoints
 */

import type {
    ISOScenarioDefinition,
    ISOCompiledScenario,
    ISOExerciseState,
    ISOExerciseExport,
    ISOPostExerciseReport,
    ISODecision,
    SyntheticEvidence,
    ISOInject,
    ISORole,
    TimeMode,
} from '../types';

const API_BASE = 'http://localhost:3001/api/v1/iso';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Transform backend exercise state to include elapsedMinutes alias
function transformExerciseState(exercise: any): ISOExerciseState {
    return {
        ...exercise,
        elapsedMinutes: exercise.scenarioTimeMinutes ?? 0, // Add alias for frontend compatibility
    };
}

// Transform array of exercises
function transformExerciseStates(exercises: any[]): ISOExerciseState[] {
    return exercises.map(transformExerciseState);
}

// =========================================================================
// SCENARIO ENDPOINTS
// =========================================================================

export async function listScenarios(): Promise<ISOScenarioDefinition[]> {
    const response = await fetch(`${API_BASE}/scenarios`);
    const result: ApiResponse<ISOScenarioDefinition[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to list scenarios');
    return result.data!;
}

export async function createScenario(
    definition: Omit<ISOScenarioDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ISOScenarioDefinition> {
    try {
        const response = await fetch(`${API_BASE}/scenarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(definition),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const result: ApiResponse<ISOScenarioDefinition> = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to create scenario');
        return result.data!;
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Cannot connect to backend server. Make sure the backend is running on port 3001.');
        }
        throw error;
    }
}

export async function getScenario(id: string): Promise<ISOScenarioDefinition> {
    const response = await fetch(`${API_BASE}/scenarios/${id}`);
    const result: ApiResponse<ISOScenarioDefinition> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get scenario');
    return result.data!;
}

export async function updateScenario(
    id: string,
    updates: Partial<ISOScenarioDefinition>
): Promise<ISOScenarioDefinition> {
    const response = await fetch(`${API_BASE}/scenarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    const result: ApiResponse<ISOScenarioDefinition> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update scenario');
    return result.data!;
}

export async function deleteScenario(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/scenarios/${id}`, {
        method: 'DELETE',
    });
    const result: ApiResponse<void> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete scenario');
}

export async function compileScenario(
    id: string,
    modelName: string
): Promise<ISOCompiledScenario> {
    const response = await fetch(`${API_BASE}/scenarios/${id}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName }),
    });
    const result: ApiResponse<ISOCompiledScenario> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to compile scenario');
    return result.data!;
}

export async function getCompiledScenario(id: string): Promise<ISOCompiledScenario> {
    const response = await fetch(`${API_BASE}/scenarios/${id}/compiled`);
    const result: ApiResponse<ISOCompiledScenario> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get compiled scenario');
    return result.data!;
}

// =========================================================================
// EXERCISE ENDPOINTS
// =========================================================================

export async function listExercises(): Promise<ISOExerciseState[]> {
    const response = await fetch(`${API_BASE}/exercises`);
    const result: ApiResponse<any[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to list exercises');
    return transformExerciseStates(result.data!);
}

export async function createExercise(scenarioId: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create exercise');
    return transformExerciseState(result.data!);
}

export async function getExercise(id: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${id}`);
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get exercise');
    return transformExerciseState(result.data!);
}

export async function startExercise(id: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${id}/start`, {
        method: 'POST',
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to start exercise');
    return transformExerciseState(result.data!);
}

export async function pauseExercise(id: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${id}/pause`, {
        method: 'POST',
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to pause exercise');
    return transformExerciseState(result.data!);
}

export async function resumeExercise(id: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${id}/resume`, {
        method: 'POST',
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to resume exercise');
    return transformExerciseState(result.data!);
}

export async function endExercise(id: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${id}/end`, {
        method: 'POST',
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to end exercise');
    return transformExerciseState(result.data!);
}

// =========================================================================
// RUNTIME ENDPOINTS
// =========================================================================

export async function switchRole(exerciseId: string, role: ISORole): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to switch role');
    return transformExerciseState(result.data!);
}

export async function setTimeMode(exerciseId: string, mode: TimeMode): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/time-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to set time mode');
    return transformExerciseState(result.data!);
}

export async function advanceTime(exerciseId: string, minutes: number): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/advance-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to advance time');
    return transformExerciseState(result.data!);
}

export async function releaseInject(exerciseId: string, injectId: string): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/release-inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ injectId }),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to release inject');
    return transformExerciseState(result.data!);
}

export async function getDueInjects(exerciseId: string): Promise<ISOInject[]> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/due-injects`);
    const result: ApiResponse<ISOInject[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get due injects');
    return result.data!;
}

// =========================================================================
// DECISION & EVIDENCE ENDPOINTS
// =========================================================================

export async function recordDecision(
    exerciseId: string,
    decision: {
        injectId: string;
        expectedDecisionId: string;
        selectedOptionId: string;
        evidenceConsideredIds: string[];
        notes?: string;
    }
): Promise<ISODecision> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
    });
    const result: ApiResponse<ISODecision> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to record decision');
    return result.data!;
}

export async function getEvidenceForRole(
    exerciseId: string,
    role?: ISORole
): Promise<SyntheticEvidence[]> {
    const url = role
        ? `${API_BASE}/exercises/${exerciseId}/evidence?role=${role}`
        : `${API_BASE}/exercises/${exerciseId}/evidence`;
    const response = await fetch(url);
    const result: ApiResponse<SyntheticEvidence[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get evidence');
    return result.data!;
}

export async function accessEvidence(
    exerciseId: string,
    evidenceId: string
): Promise<SyntheticEvidence> {
    const response = await fetch(
        `${API_BASE}/exercises/${exerciseId}/evidence/${evidenceId}/access`,
        { method: 'POST' }
    );
    const result: ApiResponse<SyntheticEvidence> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to access evidence');
    return result.data!;
}

// =========================================================================
// EXPORT / IMPORT ENDPOINTS
// =========================================================================

export async function exportExercise(exerciseId: string): Promise<ISOExerciseExport> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/export`);
    const result: ApiResponse<ISOExerciseExport> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to export exercise');
    return result.data!;
}

export async function importExercise(data: ISOExerciseExport): Promise<ISOExerciseState> {
    const response = await fetch(`${API_BASE}/exercises/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result: ApiResponse<any> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to import exercise');
    return transformExerciseState(result.data!);
}

export async function generateReport(exerciseId: string): Promise<ISOPostExerciseReport> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/report`);
    const result: ApiResponse<ISOPostExerciseReport> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to generate report');
    return result.data!;
}
