import React from 'react';
import {
    TrendingUpIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    BuildingIcon,
} from '../../icons';
import type {
    ISOExerciseState,
    ISOInject,
    ExecutiveLayerAssets,
} from '../../../types';

interface ExecutiveViewProps {
    exercise: ISOExerciseState;
    selectedInject: ISOInject | null;
    onDecisionSelect: (decisionId: string, optionId: string) => void;
}

const ExecutiveView: React.FC<ExecutiveViewProps> = ({
    exercise,
    selectedInject,
    onDecisionSelect,
}) => {
    const executiveLayer = exercise.compiledScenario.executiveLayer;
    const decisions = exercise.decisions.filter(d =>
        exercise.compiledScenario.injects.some(i =>
            i.id === d.injectId && i.targetRoles.includes('Executive')
        )
    );

    // Get role-specific content for selected inject
    const getInjectContent = (inject: ISOInject) => {
        const roleContent = inject.roleContent['Executive'];
        if (roleContent) return roleContent;
        return { headline: inject.title, body: inject.description, urgency: inject.urgency };
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Executive Dashboard Header */}
            <div className="p-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <BuildingIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Executive View</h3>
                        <p className="text-sm text-muted-foreground">Strategic oversight and decision authority</p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Time</div>
                        <div className="text-lg font-semibold">T+{exercise.elapsedMinutes}m</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Decisions Made</div>
                        <div className="text-lg font-semibold">{decisions.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Pending Actions</div>
                        <div className="text-lg font-semibold text-yellow-400">
                            {exercise.releasedInjectIds.filter(id => {
                                const inject = exercise.compiledScenario.injects.find(i => i.id === id);
                                return inject?.targetRoles.includes('Executive') &&
                                       !decisions.some(d => d.injectId === id);
                            }).length}
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Severity</div>
                        <div className="text-lg font-semibold text-red-400">
                            {selectedInject?.urgency || 'Normal'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
                {selectedInject ? (
                    <div className="space-y-4">
                        {/* Inject Brief */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="text-lg font-semibold">{getInjectContent(selectedInject).headline}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                        <ClockIcon className="w-3 h-3" />
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
                        </div>

                        {/* Decision Cards */}
                        {selectedInject.expectedDecisions.length > 0 && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                    <AlertTriangleIcon className="w-4 h-4 text-primary" />
                                    Executive Decision Required
                                </h5>
                                {selectedInject.expectedDecisions.map(decision => (
                                    <div key={decision.id} className="space-y-3">
                                        <p className="text-sm font-medium">{decision.prompt}</p>
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
                                                        className={`p-3 text-left border rounded-lg transition-colors ${
                                                            isSelected
                                                                ? 'border-green-500 bg-green-500/10'
                                                                : 'border-border bg-card hover:border-primary'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-medium text-sm">{option.label}</div>
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {option.description}
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
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

                        {/* Risk Projections (if available) */}
                        {executiveLayer?.riskProjections && executiveLayer.riskProjections.length > 0 && (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                    <TrendingUpIcon className="w-4 h-4" />
                                    Risk Projections
                                </h5>
                                <div className="space-y-2">
                                    {executiveLayer.riskProjections.map((projection, idx) => (
                                        <div key={idx} className="p-3 bg-secondary/30 rounded">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium">{projection.category}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    projection.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                    projection.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {projection.severity}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{projection.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Initial Executive Brief */
                    <div className="space-y-4">
                        {executiveLayer?.initialBrief ? (
                            <div className="p-4 bg-card border border-border rounded-lg">
                                <h4 className="font-semibold mb-3">Executive Brief</h4>
                                <div className="prose prose-sm prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-sm">
                                        {executiveLayer.initialBrief}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <BuildingIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select an inject from the timeline</p>
                                <p className="text-sm">to view executive briefings and make decisions</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExecutiveView;
