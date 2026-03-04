import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    UploadCloudIcon,
    FileDownIcon,
    ShieldIcon,
    NetworkIcon,
    FileTextIcon,
    SparklesIcon,
    ActivityIcon,
} from '../icons';
import type {
    ISOScenarioDefinition,
    ISOCompiledScenario,
    ISOExerciseState,
} from '../../types';
import * as isoService from '../../services/isoService';
import ScenarioBuilder from './ScenarioBuilder';
import ExerciseCommandConsole from './ExerciseCommandConsole';

type ISOView = 'scenarios' | 'builder' | 'exercise';

const ISOContainer: React.FC = () => {
    const [currentView, setCurrentView] = useState<ISOView>('scenarios');
    const [scenarios, setScenarios] = useState<ISOScenarioDefinition[]>([]);
    const [exercises, setExercises] = useState<ISOExerciseState[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<ISOScenarioDefinition | null>(null);
    const [compiledScenario, setCompiledScenario] = useState<ISOCompiledScenario | null>(null);
    const [activeExercise, setActiveExercise] = useState<ISOExerciseState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadScenarios();
        loadExercises();
    }, []);

    const loadScenarios = async () => {
        try {
            const data = await isoService.listScenarios();
            setScenarios(data);
        } catch (err: any) {
            console.error('Failed to load scenarios:', err);
        }
    };

    const loadExercises = async () => {
        try {
            const data = await isoService.listExercises();
            setExercises(data);
        } catch (err: any) {
            console.error('Failed to load exercises:', err);
        }
    };

    const handleCreateScenario = async (definition: Omit<ISOScenarioDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('[ISO] Creating scenario:', definition);
            const scenario = await isoService.createScenario(definition);
            console.log('[ISO] Scenario created:', scenario);
            setScenarios(prev => [...prev, scenario]);
            setSelectedScenario(scenario);
            setCurrentView('scenarios');
        } catch (err: any) {
            console.error('[ISO] Error creating scenario:', err);
            setError(err.message || 'Failed to create scenario. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompileScenario = async (scenarioId: string, modelName: string) => {
        setIsCompiling(true);
        setError(null);
        try {
            const compiled = await isoService.compileScenario(scenarioId, modelName);
            setCompiledScenario(compiled);
            await loadScenarios();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCompiling(false);
        }
    };

    const handleStartExercise = async (scenarioId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const exercise = await isoService.createExercise(scenarioId);
            setActiveExercise(exercise);
            setExercises(prev => [...prev, exercise]);
            setCurrentView('exercise');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExerciseUpdate = (updatedExercise: ISOExerciseState) => {
        setActiveExercise(updatedExercise);
        setExercises(prev => prev.map(e => e.id === updatedExercise.id ? updatedExercise : e));
    };

    const handleExport = async (exerciseId: string) => {
        try {
            const exportData = await isoService.exportExercise(exerciseId);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `iso-exercise-${exerciseId}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleImport = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const exercise = await isoService.importExercise(data);
            setActiveExercise(exercise);
            setExercises(prev => [...prev, exercise]);
            setCurrentView('exercise');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderScenarioList = () => (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                    <h2 className="text-lg font-semibold">Incident Simulation Orchestrator</h2>
                    <p className="text-sm text-muted-foreground">Multi-role incident response exercises</p>
                </div>
                <div className="flex gap-2">
                    <label className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium cursor-pointer hover:bg-secondary/80 flex items-center gap-2">
                        <UploadCloudIcon className="w-4 h-4" />
                        Import
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                        />
                    </label>
                    <button
                        onClick={() => setCurrentView('builder')}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        New Scenario
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-xs hover:underline">Dismiss</button>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4">
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Scenarios</h3>
                    {scenarios.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No scenarios yet</p>
                            <p className="text-sm">Create a new scenario to get started</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {scenarios.map(scenario => (
                                <div
                                    key={scenario.id}
                                    className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                                        selectedScenario?.id === scenario.id ? 'border-primary' : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={() => setSelectedScenario(scenario)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-medium">{scenario.name}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                                        </div>
                                        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">
                                            {scenario.targetOrganization.sector}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <ShieldIcon className="w-3 h-3" />
                                            {scenario.threatActor.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ActivityIcon className="w-3 h-3" />
                                            {scenario.exerciseDurationMinutes} min
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <NetworkIcon className="w-3 h-3" />
                                            {scenario.targetInjectCount} injects
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedScenario && (
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                        <h3 className="font-medium mb-3">Selected: {selectedScenario.name}</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleCompileScenario(selectedScenario.id, 'gemini-2.0-flash')}
                                disabled={isCompiling}
                                className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 flex items-center gap-2 disabled:opacity-50"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                {isCompiling ? 'Compiling...' : 'Compile Scenario'}
                            </button>
                            <button
                                onClick={() => handleStartExercise(selectedScenario.id)}
                                disabled={isLoading || !compiledScenario}
                                className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                            >
                                <ActivityIcon className="w-4 h-4" />
                                Start Exercise
                            </button>
                        </div>
                        {compiledScenario && (
                            <div className="mt-3 text-sm text-green-500">
                                Scenario compiled with {compiledScenario.injects.length} injects
                            </div>
                        )}
                    </div>
                )}

                {exercises.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Active Exercises</h3>
                        <div className="grid gap-3">
                            {exercises.map(exercise => (
                                <div
                                    key={exercise.id}
                                    className="p-4 bg-card border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => {
                                        setActiveExercise(exercise);
                                        setCurrentView('exercise');
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">{exercise.compiledScenario.definition.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                T+{exercise.elapsedMinutes} min | Role: {exercise.currentRole}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded ${
                                                exercise.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                                                exercise.status === 'Paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                exercise.status === 'Completed' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-secondary text-secondary-foreground'
                                            }`}>
                                                {exercise.status}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExport(exercise.id);
                                                }}
                                                className="p-1 hover:bg-secondary rounded"
                                                title="Export"
                                            >
                                                <FileDownIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full bg-background">
            {currentView === 'scenarios' && renderScenarioList()}
            {currentView === 'builder' && (
                <ScenarioBuilder
                    onSave={handleCreateScenario}
                    onCancel={() => setCurrentView('scenarios')}
                    isLoading={isLoading}
                />
            )}
            {currentView === 'exercise' && activeExercise && (
                <ExerciseCommandConsole
                    exercise={activeExercise}
                    onExerciseUpdate={handleExerciseUpdate}
                    onBack={() => setCurrentView('scenarios')}
                    onExport={() => handleExport(activeExercise.id)}
                />
            )}
        </div>
    );
};

export default ISOContainer;
