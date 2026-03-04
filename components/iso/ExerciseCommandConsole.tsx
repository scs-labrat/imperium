import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeftIcon,
    PlayIcon,
    PauseIcon,
    SquareIcon,
    DownloadIcon,
    ClockIcon,
    UsersIcon,
    ShieldIcon,
    BuildingIcon,
    ScaleIcon,
    NetworkIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    CircleDotIcon,
    FileTextIcon,
    EyeIcon,
    LoaderIcon,
} from '../icons';
import type {
    ISOExerciseState,
    ISORole,
    TimeMode,
    ISOInject,
    SyntheticEvidence,
} from '../../types';
import * as isoService from '../../services/isoService';

interface ExerciseCommandConsoleProps {
    exercise: ISOExerciseState;
    onExerciseUpdate: (exercise: ISOExerciseState) => void;
    onBack: () => void;
    onExport: () => void;
}

const ROLE_LABELS: Record<ISORole, { label: string; icon: React.ReactNode; color: string }> = {
    Controller: { label: 'Controller', icon: <UsersIcon className="w-4 h-4" />, color: 'text-purple-400' },
    Executive: { label: 'Executive', icon: <BuildingIcon className="w-4 h-4" />, color: 'text-blue-400' },
    SOC_IR: { label: 'SOC/IR', icon: <ShieldIcon className="w-4 h-4" />, color: 'text-red-400' },
    OT_Engineer: { label: 'OT Engineer', icon: <NetworkIcon className="w-4 h-4" />, color: 'text-orange-400' },
    Legal_Comms: { label: 'Legal/Comms', icon: <ScaleIcon className="w-4 h-4" />, color: 'text-green-400' },
};

const TIME_MODE_LABELS: Record<TimeMode, string> = {
    RealTime: '1x (Real-time)',
    Accelerated_2x: '2x',
    Accelerated_5x: '5x',
    Accelerated_10x: '10x',
    Manual: 'Manual',
};

const ExerciseCommandConsole: React.FC<ExerciseCommandConsoleProps> = ({
    exercise,
    onExerciseUpdate,
    onBack,
    onExport,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [evidence, setEvidence] = useState<SyntheticEvidence[]>([]);
    const [selectedInject, setSelectedInject] = useState<ISOInject | null>(null);
    const [selectedEvidence, setSelectedEvidence] = useState<SyntheticEvidence | null>(null);

    // Load evidence for current role
    useEffect(() => {
        loadEvidence();
    }, [exercise.id, exercise.currentRole]);

    const loadEvidence = async () => {
        try {
            const data = await isoService.getEvidenceForRole(exercise.id, exercise.currentRole as ISORole);
            setEvidence(data);
        } catch (err: any) {
            console.error('Failed to load evidence:', err);
        }
    };

    // Exercise control handlers
    const handleStart = async () => {
        setIsLoading(true);
        try {
            const updated = await isoService.startExercise(exercise.id);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = async () => {
        setIsLoading(true);
        try {
            const updated = await isoService.pauseExercise(exercise.id);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResume = async () => {
        setIsLoading(true);
        try {
            const updated = await isoService.resumeExercise(exercise.id);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnd = async () => {
        if (!confirm('Are you sure you want to end this exercise?')) return;
        setIsLoading(true);
        try {
            const updated = await isoService.endExercise(exercise.id);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchRole = async (role: ISORole) => {
        setIsLoading(true);
        try {
            const updated = await isoService.switchRole(exercise.id, role);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetTimeMode = async (mode: TimeMode) => {
        try {
            const updated = await isoService.setTimeMode(exercise.id, mode);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleAdvanceTime = async (minutes: number) => {
        try {
            const updated = await isoService.advanceTime(exercise.id, minutes);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleReleaseInject = async (injectId: string) => {
        try {
            const updated = await isoService.releaseInject(exercise.id, injectId);
            onExerciseUpdate(updated);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleAccessEvidence = async (evidenceId: string) => {
        try {
            const ev = await isoService.accessEvidence(exercise.id, evidenceId);
            setSelectedEvidence(ev);
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Get injects for timeline
    const injects = exercise.compiledScenario.injects;
    const releasedInjects = injects.filter(i => exercise.releasedInjectIds.includes(i.id));
    const pendingInjects = injects.filter(i => !exercise.releasedInjectIds.includes(i.id));

    // Get role-specific content for selected inject
    const getInjectContent = (inject: ISOInject) => {
        const roleContent = inject.roleContent[exercise.currentRole as ISORole];
        if (roleContent) return roleContent;
        return { headline: inject.title, body: inject.description, urgency: inject.urgency };
    };

    const isRunning = exercise.status === 'Running';
    const isPaused = exercise.status === 'Paused';
    const isCompleted = exercise.status === 'Completed';

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Top Control Bar */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-card">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-secondary rounded-md">
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="font-semibold">{exercise.compiledScenario.definition.name}</h2>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                                isRunning ? 'bg-green-500/20 text-green-400' :
                                isPaused ? 'bg-yellow-500/20 text-yellow-400' :
                                isCompleted ? 'bg-blue-500/20 text-blue-400' :
                                'bg-secondary text-secondary-foreground'
                            }`}>
                                {exercise.status}
                            </span>
                            <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                T+{exercise.elapsedMinutes} min
                            </span>
                        </div>
                    </div>
                </div>

                {/* Exercise Controls */}
                <div className="flex items-center gap-2">
                    {!isRunning && !isCompleted && (
                        <button
                            onClick={isPaused ? handleResume : handleStart}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                        >
                            <PlayIcon className="w-4 h-4" />
                            {isPaused ? 'Resume' : 'Start'}
                        </button>
                    )}
                    {isRunning && (
                        <button
                            onClick={handlePause}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 flex items-center gap-2"
                        >
                            <PauseIcon className="w-4 h-4" />
                            Pause
                        </button>
                    )}
                    {!isCompleted && (
                        <button
                            onClick={handleEnd}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 flex items-center gap-2"
                        >
                            <SquareIcon className="w-4 h-4" />
                            End
                        </button>
                    )}
                    <button
                        onClick={onExport}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Time and Role Controls */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
                {/* Time Controls */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <select
                        value={exercise.timeMode}
                        onChange={(e) => handleSetTimeMode(e.target.value as TimeMode)}
                        className="px-2 py-1 bg-secondary border border-border rounded text-sm"
                    >
                        {Object.entries(TIME_MODE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    {exercise.timeMode === 'Manual' && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleAdvanceTime(5)}
                                className="px-2 py-1 bg-secondary text-xs rounded hover:bg-secondary/80"
                            >
                                +5m
                            </button>
                            <button
                                onClick={() => handleAdvanceTime(15)}
                                className="px-2 py-1 bg-secondary text-xs rounded hover:bg-secondary/80"
                            >
                                +15m
                            </button>
                        </div>
                    )}
                </div>

                {/* Role Switcher */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="flex gap-1">
                        {Object.entries(ROLE_LABELS).map(([role, { label, icon, color }]) => (
                            <button
                                key={role}
                                onClick={() => handleSwitchRole(role as ISORole)}
                                className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                                    exercise.currentRole === role
                                        ? `bg-primary/20 ${color}`
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="mx-4 mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-xs hover:underline">Dismiss</button>
                </div>
            )}

            {/* Main 3-Panel Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Timeline */}
                <div className="w-72 border-r border-border flex flex-col bg-card/30">
                    <div className="p-3 border-b border-border">
                        <h3 className="font-semibold text-sm">Inject Timeline</h3>
                        <p className="text-xs text-muted-foreground">{releasedInjects.length} released / {injects.length} total</p>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {/* Released Injects */}
                        {releasedInjects.map(inject => (
                            <button
                                key={inject.id}
                                onClick={() => setSelectedInject(inject)}
                                className={`w-full text-left p-2 rounded border transition-colors ${
                                    selectedInject?.id === inject.id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50 bg-card'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">{inject.title}</div>
                                        <div className="text-xs text-muted-foreground">T+{inject.scheduledMinutes} min</div>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {/* Pending Injects (Controller Only) */}
                        {exercise.currentRole === 'Controller' && pendingInjects.length > 0 && (
                            <>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-4 mb-2">Pending</div>
                                {pendingInjects.map(inject => (
                                    <button
                                        key={inject.id}
                                        onClick={() => setSelectedInject(inject)}
                                        className={`w-full text-left p-2 rounded border transition-colors ${
                                            selectedInject?.id === inject.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50 bg-card/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <CircleDotIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">{inject.title}</div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">T+{inject.scheduledMinutes} min</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReleaseInject(inject.id);
                                                        }}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        Release
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Center Panel - Role View / Inject Detail */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            {ROLE_LABELS[exercise.currentRole as ISORole]?.icon}
                            {ROLE_LABELS[exercise.currentRole as ISORole]?.label} View
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {selectedInject ? (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-lg font-semibold">{getInjectContent(selectedInject).headline}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                            <span>T+{selectedInject.scheduledMinutes} min</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                selectedInject.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                selectedInject.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                selectedInject.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-secondary text-secondary-foreground'
                                            }`}>
                                                {selectedInject.urgency}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="prose prose-sm prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-sm">
                                        {getInjectContent(selectedInject).body}
                                    </div>
                                </div>

                                {/* Expected Decisions */}
                                {selectedInject.expectedDecisions.length > 0 && (
                                    <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border">
                                        <h5 className="font-medium mb-3">Decision Required</h5>
                                        {selectedInject.expectedDecisions.map(decision => (
                                            <div key={decision.id} className="space-y-2">
                                                <p className="text-sm">{decision.prompt}</p>
                                                <div className="grid gap-2">
                                                    {decision.options.map(option => (
                                                        <button
                                                            key={option.id}
                                                            className="p-3 text-left bg-card border border-border rounded-lg hover:border-primary transition-colors"
                                                        >
                                                            <div className="font-medium text-sm">{option.label}</div>
                                                            <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select an inject from the timeline</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Evidence Feed */}
                <div className="w-80 border-l border-border flex flex-col bg-card/30">
                    <div className="p-3 border-b border-border">
                        <h3 className="font-semibold text-sm">Evidence Feed</h3>
                        <p className="text-xs text-muted-foreground">{evidence.length} items visible to {ROLE_LABELS[exercise.currentRole as ISORole]?.label}</p>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {evidence.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No evidence available yet
                            </div>
                        ) : (
                            evidence.map(ev => (
                                <button
                                    key={ev.id}
                                    onClick={() => handleAccessEvidence(ev.id)}
                                    className={`w-full text-left p-2 rounded border transition-colors ${
                                        selectedEvidence?.id === ev.id
                                            ? 'border-primary bg-primary/10'
                                            : exercise.accessedEvidenceIds.includes(ev.id)
                                                ? 'border-green-500/30 bg-green-500/5'
                                                : 'border-border hover:border-primary/50 bg-card'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                            ev.type === 'Alert' ? 'bg-red-500' :
                                            ev.type === 'Log' ? 'bg-blue-500' :
                                            ev.type === 'Email' ? 'bg-yellow-500' :
                                            'bg-gray-500'
                                        }`} />
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">{ev.title}</div>
                                            <div className="text-xs text-muted-foreground truncate">{ev.source}</div>
                                            {exercise.accessedEvidenceIds.includes(ev.id) && (
                                                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                                                    <EyeIcon className="w-3 h-3" />
                                                    Accessed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Evidence Detail Modal */}
                    {selectedEvidence && (
                        <div className="p-3 border-t border-border bg-card">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{selectedEvidence.title}</h4>
                                <button onClick={() => setSelectedEvidence(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                    Close
                                </button>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                                {selectedEvidence.type} | {selectedEvidence.source}
                            </div>
                            <div className="text-xs bg-secondary/50 p-2 rounded max-h-48 overflow-auto font-mono whitespace-pre-wrap">
                                {selectedEvidence.content}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExerciseCommandConsole;
