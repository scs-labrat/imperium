import React from 'react';
import {
    NetworkIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    ActivityIcon,
} from '../../icons';
import type {
    ISOExerciseState,
    ISOInject,
    SyntheticEvidence,
} from '../../../types';

interface OTViewProps {
    exercise: ISOExerciseState;
    selectedInject: ISOInject | null;
    evidence: SyntheticEvidence[];
    onDecisionSelect: (decisionId: string, optionId: string) => void;
    onEvidenceAccess: (evidenceId: string) => void;
}

const OTView: React.FC<OTViewProps> = ({
    exercise,
    selectedInject,
    evidence,
    onDecisionSelect,
    onEvidenceAccess,
}) => {
    const otLayer = exercise.compiledScenario.otLayer;
    const decisions = exercise.decisions.filter(d =>
        exercise.compiledScenario.injects.some(i =>
            i.id === d.injectId && i.targetRoles.includes('OT_Engineer')
        )
    );

    // Get role-specific content for selected inject
    const getInjectContent = (inject: ISOInject) => {
        const roleContent = inject.roleContent['OT_Engineer'];
        if (roleContent) return roleContent;
        return { headline: inject.title, body: inject.description, urgency: inject.urgency };
    };

    // Filter OT-relevant evidence
    const otEvidence = evidence.filter(e =>
        e.type === 'OT_Readout' ||
        e.visibleToRoles.includes('OT_Engineer')
    );

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* OT Dashboard Header */}
            <div className="p-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <NetworkIcon className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">OT/ICS Engineer View</h3>
                        <p className="text-sm text-muted-foreground">Operational Technology & Process Control</p>
                    </div>
                </div>

                {/* Safety Status Indicators */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg border-l-4 border-green-500">
                        <div className="text-xs text-muted-foreground">Safety Systems</div>
                        <div className="text-lg font-semibold text-green-400">ACTIVE</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Process Status</div>
                        <div className="text-lg font-semibold">
                            {selectedInject?.urgency === 'critical' ? (
                                <span className="text-red-400">DEGRADED</span>
                            ) : (
                                <span className="text-green-400">NORMAL</span>
                            )}
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">OT Alerts</div>
                        <div className="text-lg font-semibold text-yellow-400">{otEvidence.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Time</div>
                        <div className="text-lg font-semibold">T+{exercise.elapsedMinutes}m</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Process Overview & Inject */}
                    <div className="space-y-4">
                        {/* Process Model (if available) */}
                        {otLayer?.processModel && (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h5 className="font-medium mb-3">Process Overview</h5>
                                <div className="text-sm text-muted-foreground mb-2">
                                    {otLayer.processModel.description}
                                </div>
                                {otLayer.processModel.stages && (
                                    <div className="flex flex-wrap gap-2">
                                        {otLayer.processModel.stages.map((stage, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-secondary/50 rounded text-xs">
                                                {stage}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedInject ? (
                            <>
                                {/* OT Alert Brief */}
                                <div className="p-4 bg-card border border-orange-500/30 rounded-lg">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <AlertTriangleIcon className="w-4 h-4 text-orange-400" />
                                                {getInjectContent(selectedInject).headline}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                <ClockIcon className="w-3 h-3" />
                                                <span>T+{selectedInject.scheduledMinutes} min</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            selectedInject.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            selectedInject.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {selectedInject.urgency}
                                        </span>
                                    </div>

                                    <div className="text-sm whitespace-pre-wrap">
                                        {getInjectContent(selectedInject).body}
                                    </div>
                                </div>

                                {/* OT Response Actions */}
                                {selectedInject.expectedDecisions.length > 0 && (
                                    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                                        <h5 className="font-medium mb-3 text-orange-400">OT Response Required</h5>
                                        {selectedInject.expectedDecisions.map(decision => (
                                            <div key={decision.id} className="space-y-2">
                                                <p className="text-sm">{decision.prompt}</p>
                                                <div className="grid gap-2">
                                                    {decision.options.map(option => {
                                                        const isSelected = decisions.some(
                                                            d => d.injectId === selectedInject.id &&
                                                                 d.selectedOptionId === option.id
                                                        );
                                                        return (
                                                            <button
                                                                key={option.id}
                                                                onClick={() => onDecisionSelect(decision.id, option.id)}
                                                                disabled={isSelected}
                                                                className={`p-2 text-left text-sm border rounded transition-colors ${
                                                                    isSelected
                                                                        ? 'border-green-500 bg-green-500/10'
                                                                        : 'border-border bg-card hover:border-orange-500'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span>{option.label}</span>
                                                                    {isSelected && (
                                                                        <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <div className="text-center py-8 text-muted-foreground">
                                    <NetworkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Select an alert from the timeline</p>
                                    <p className="text-sm">to view OT impact assessment</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Safety Chains & Readouts */}
                    <div className="space-y-4">
                        {/* Safety Chain Status */}
                        {otLayer?.safetyChains && otLayer.safetyChains.length > 0 && (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                    <AlertTriangleIcon className="w-4 h-4 text-yellow-400" />
                                    Safety Interlocks
                                </h5>
                                <div className="space-y-2">
                                    {otLayer.safetyChains.map((chain, idx) => (
                                        <div key={idx} className="p-2 bg-secondary/30 rounded flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium">{chain.name}</div>
                                                <div className="text-xs text-muted-foreground">{chain.description}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                chain.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                chain.status === 'bypassed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {chain.status || 'active'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OT Readouts/Evidence */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                <ActivityIcon className="w-4 h-4 text-orange-400" />
                                System Readouts ({otEvidence.length})
                            </h5>
                            <div className="space-y-2 max-h-64 overflow-auto">
                                {otEvidence.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No OT telemetry available</p>
                                ) : (
                                    otEvidence.map(ev => (
                                        <button
                                            key={ev.id}
                                            onClick={() => onEvidenceAccess(ev.id)}
                                            className={`w-full p-2 text-left text-sm border rounded transition-colors ${
                                                exercise.accessedEvidenceIds.includes(ev.id)
                                                    ? 'border-green-500/30 bg-green-500/5'
                                                    : 'border-border bg-secondary/30 hover:border-orange-500/50'
                                            }`}
                                        >
                                            <div className="font-medium truncate">{ev.title}</div>
                                            <div className="text-xs text-muted-foreground">{ev.source}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Operator Friction Warning */}
                        {otLayer?.operatorFriction && otLayer.operatorFriction.length > 0 && (
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <h5 className="font-medium mb-2 text-red-400 text-sm">Operational Constraints</h5>
                                <div className="space-y-1 text-xs">
                                    {otLayer.operatorFriction.map((friction, idx) => (
                                        <div key={idx} className="text-muted-foreground">
                                            {friction.constraint}: {friction.impact}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OTView;
