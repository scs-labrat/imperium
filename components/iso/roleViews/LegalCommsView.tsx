import React, { useState } from 'react';
import {
    ScaleIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    FileTextIcon,
} from '../../icons';
import type {
    ISOExerciseState,
    ISOInject,
    NotificationClock,
} from '../../../types';

interface LegalCommsViewProps {
    exercise: ISOExerciseState;
    selectedInject: ISOInject | null;
    onDecisionSelect: (decisionId: string, optionId: string) => void;
}

const LegalCommsView: React.FC<LegalCommsViewProps> = ({
    exercise,
    selectedInject,
    onDecisionSelect,
}) => {
    const [selectedDraft, setSelectedDraft] = useState<string | null>(null);

    const legalLayer = exercise.compiledScenario.legalCommsLayer;
    const decisions = exercise.decisions.filter(d =>
        exercise.compiledScenario.injects.some(i =>
            i.id === d.injectId && i.targetRoles.includes('Legal_Comms')
        )
    );

    // Get role-specific content for selected inject
    const getInjectContent = (inject: ISOInject) => {
        const roleContent = inject.roleContent['Legal_Comms'];
        if (roleContent) return roleContent;
        return { headline: inject.title, body: inject.description, urgency: inject.urgency };
    };

    // Calculate notification clock status
    const getClockStatus = (clock: NotificationClock) => {
        const elapsed = exercise.elapsedMinutes;
        // Convert deadline from hours to minutes
        const deadlineMinutes = clock.deadlineHours * 60;
        const remaining = deadlineMinutes - elapsed;

        if (remaining <= 0) return { status: 'overdue', remaining: 0, color: 'text-red-400' };
        if (remaining <= 15) return { status: 'critical', remaining, color: 'text-red-400' };
        if (remaining <= 30) return { status: 'warning', remaining, color: 'text-yellow-400' };
        return { status: 'normal', remaining, color: 'text-green-400' };
    };

    // Get notification clocks from state or layer
    const notificationClocks = Object.values(exercise.notificationClockStates || {});
    const fallbackClocks = legalLayer?.notificationClocks || [];
    const clocks = notificationClocks.length > 0 ? notificationClocks : fallbackClocks;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Legal/Comms Dashboard Header */}
            <div className="p-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <ScaleIcon className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Legal & Communications View</h3>
                        <p className="text-sm text-muted-foreground">Regulatory Compliance & Stakeholder Communications</p>
                    </div>
                </div>

                {/* Notification Clock Summary */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Time</div>
                        <div className="text-lg font-semibold">T+{exercise.elapsedMinutes}m</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Notification Clocks</div>
                        <div className="text-lg font-semibold text-yellow-400">{clocks.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Decisions Made</div>
                        <div className="text-lg font-semibold">{decisions.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Comms Drafted</div>
                        <div className="text-lg font-semibold">
                            {legalLayer?.commsDrafts?.length || 0}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Inject & Regulatory */}
                    <div className="space-y-4">
                        {selectedInject ? (
                            <>
                                {/* Legal Brief */}
                                <div className="p-4 bg-card border border-border rounded-lg">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <ScaleIcon className="w-4 h-4 text-green-400" />
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

                                {/* Legal/Comms Actions */}
                                {selectedInject.expectedDecisions.length > 0 && (
                                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                                        <h5 className="font-medium mb-3 text-green-400">Action Required</h5>
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
                                                                        : 'border-border bg-card hover:border-green-500'
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
                                    <ScaleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Select an item from the timeline</p>
                                    <p className="text-sm">to view legal and communications requirements</p>
                                </div>
                            </div>
                        )}

                        {/* Regulator Thresholds */}
                        {legalLayer?.regulatorThresholds && legalLayer.regulatorThresholds.length > 0 && (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h5 className="font-medium mb-3">Regulatory Thresholds</h5>
                                <div className="space-y-2">
                                    {legalLayer.regulatorThresholds.map((threshold, idx) => (
                                        <div key={idx} className="p-2 bg-secondary/30 rounded">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium">{threshold.regulator}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {threshold.timeframeHours}h deadline
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{threshold.requirement}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Notification Clocks & Comms Drafts */}
                    <div className="space-y-4">
                        {/* Notification Clocks */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-yellow-400" />
                                Notification Clocks
                            </h5>
                            <div className="space-y-2">
                                {clocks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No notification deadlines active</p>
                                ) : (
                                    clocks.map((clock, idx) => {
                                        const { status, remaining, color } = getClockStatus(clock);
                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 bg-secondary/30 rounded border-l-4 ${
                                                    status === 'overdue' ? 'border-red-500' :
                                                    status === 'critical' ? 'border-red-500' :
                                                    status === 'warning' ? 'border-yellow-500' :
                                                    'border-green-500'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium">{clock.regulation}</span>
                                                    <span className={`text-sm font-mono ${color}`}>
                                                        {status === 'overdue' ? 'OVERDUE' : `${remaining}m remaining`}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{clock.triggerCondition}</p>
                                                <div className="flex justify-between items-center mt-2 text-xs">
                                                    <span className="text-muted-foreground">{clock.deadlineHours}h deadline</span>
                                                    <span className={`px-2 py-0.5 rounded ${
                                                        status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                                                        status === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                        status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-green-500/20 text-green-400'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Communications Drafts */}
                        {legalLayer?.commsDrafts && legalLayer.commsDrafts.length > 0 && (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                    <FileTextIcon className="w-4 h-4 text-blue-400" />
                                    Communications Templates
                                </h5>
                                <div className="space-y-2">
                                    {legalLayer.commsDrafts.map((draft, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDraft(selectedDraft === draft.id ? null : draft.id)}
                                            className={`w-full p-2 text-left text-sm border rounded transition-colors ${
                                                selectedDraft === draft.id
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-border bg-secondary/30 hover:border-blue-500/50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{draft.title}</span>
                                                <span className="text-xs text-muted-foreground">{draft.audience}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Selected Draft Preview */}
                                {selectedDraft && (
                                    <div className="mt-4 p-3 bg-secondary/50 rounded border border-border">
                                        <h6 className="text-sm font-medium mb-2">Draft Preview</h6>
                                        <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                                            {legalLayer.commsDrafts.find(d => d.id === selectedDraft)?.content || 'No content'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalCommsView;
