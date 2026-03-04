import React, { useState } from 'react';
import {
    ShieldIcon,
    SearchIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    TerminalIcon,
    ActivityIcon,
} from '../../icons';
import type {
    ISOExerciseState,
    ISOInject,
    SyntheticEvidence,
} from '../../../types';

interface SOCIRViewProps {
    exercise: ISOExerciseState;
    selectedInject: ISOInject | null;
    evidence: SyntheticEvidence[];
    onDecisionSelect: (decisionId: string, optionId: string) => void;
    onEvidenceAccess: (evidenceId: string) => void;
}

const SOCIRView: React.FC<SOCIRViewProps> = ({
    exercise,
    selectedInject,
    evidence,
    onDecisionSelect,
    onEvidenceAccess,
}) => {
    const [queryInput, setQueryInput] = useState('');
    const [queryResults, setQueryResults] = useState<string[]>([]);

    const socLayer = exercise.compiledScenario.socIrLayer;
    const decisions = exercise.decisions.filter(d =>
        exercise.compiledScenario.injects.some(i =>
            i.id === d.injectId && i.targetRoles.includes('SOC_IR')
        )
    );

    // Get role-specific content for selected inject
    const getInjectContent = (inject: ISOInject) => {
        const roleContent = inject.roleContent['SOC_IR'];
        if (roleContent) return roleContent;
        return { headline: inject.title, body: inject.description, urgency: inject.urgency };
    };

    // Simulated query execution
    const handleQuerySubmit = () => {
        if (!queryInput.trim()) return;

        // Simulate query results based on input
        const results = evidence
            .filter(e =>
                e.content.toLowerCase().includes(queryInput.toLowerCase()) ||
                e.title.toLowerCase().includes(queryInput.toLowerCase())
            )
            .map(e => `[${e.type}] ${e.title}: Found matching content`);

        setQueryResults(results.length > 0 ? results : ['No results found for query']);
        setQueryInput('');
    };

    // Group evidence by type
    const alertEvidence = evidence.filter(e => e.type === 'Alert');
    const logEvidence = evidence.filter(e => e.type === 'Log');
    const otherEvidence = evidence.filter(e => e.type !== 'Alert' && e.type !== 'Log');

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* SOC Dashboard Header */}
            <div className="p-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <ShieldIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">SOC/IR View</h3>
                        <p className="text-sm text-muted-foreground">Security Operations & Incident Response</p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-5 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Alerts</div>
                        <div className="text-lg font-semibold text-red-400">{alertEvidence.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Logs Analyzed</div>
                        <div className="text-lg font-semibold">{exercise.accessedEvidenceIds.filter(id =>
                            logEvidence.some(e => e.id === id)
                        ).length}/{logEvidence.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">IOCs Found</div>
                        <div className="text-lg font-semibold text-yellow-400">
                            {evidence.filter(e => e.content.includes('IOC') || e.content.includes('indicator')).length}
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Decisions</div>
                        <div className="text-lg font-semibold">{decisions.length}</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Time</div>
                        <div className="text-lg font-semibold">T+{exercise.elapsedMinutes}m</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Inject/Investigation */}
                    <div className="space-y-4">
                        {selectedInject ? (
                            <>
                                {/* Alert Brief */}
                                <div className="p-4 bg-card border border-border rounded-lg">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <AlertTriangleIcon className="w-4 h-4 text-red-400" />
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

                                {/* Investigation Actions */}
                                {selectedInject.expectedDecisions.length > 0 && (
                                    <div className="p-4 bg-secondary/30 border border-border rounded-lg">
                                        <h5 className="font-medium mb-3">Investigation Actions</h5>
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
                                                                        : 'border-border bg-card hover:border-primary'
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
                                    <ShieldIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Select an alert from the timeline</p>
                                    <p className="text-sm">to begin investigation</p>
                                </div>
                            </div>
                        )}

                        {/* Query Simulator */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                <TerminalIcon className="w-4 h-4" />
                                SIEM Query Console
                            </h5>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={queryInput}
                                    onChange={(e) => setQueryInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
                                    placeholder="Enter search query..."
                                    className="flex-1 px-3 py-1.5 bg-secondary border border-border rounded text-sm font-mono"
                                />
                                <button
                                    onClick={handleQuerySubmit}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm"
                                >
                                    <SearchIcon className="w-4 h-4" />
                                </button>
                            </div>
                            {queryResults.length > 0 && (
                                <div className="bg-secondary/50 p-2 rounded text-xs font-mono max-h-32 overflow-auto">
                                    {queryResults.map((result, idx) => (
                                        <div key={idx} className="text-muted-foreground">{result}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Evidence & Visibility */}
                    <div className="space-y-4">
                        {/* Alert Queue */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                <AlertTriangleIcon className="w-4 h-4 text-red-400" />
                                Active Alerts ({alertEvidence.length})
                            </h5>
                            <div className="space-y-2 max-h-48 overflow-auto">
                                {alertEvidence.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No alerts available</p>
                                ) : (
                                    alertEvidence.map(alert => (
                                        <button
                                            key={alert.id}
                                            onClick={() => onEvidenceAccess(alert.id)}
                                            className={`w-full p-2 text-left text-sm border rounded transition-colors ${
                                                exercise.accessedEvidenceIds.includes(alert.id)
                                                    ? 'border-green-500/30 bg-green-500/5'
                                                    : 'border-border bg-secondary/30 hover:border-red-500/50'
                                            }`}
                                        >
                                            <div className="font-medium truncate">{alert.title}</div>
                                            <div className="text-xs text-muted-foreground">{alert.source}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Log Sources */}
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                <ActivityIcon className="w-4 h-4 text-blue-400" />
                                Log Sources ({logEvidence.length})
                            </h5>
                            <div className="space-y-2 max-h-48 overflow-auto">
                                {logEvidence.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No logs available</p>
                                ) : (
                                    logEvidence.map(log => (
                                        <button
                                            key={log.id}
                                            onClick={() => onEvidenceAccess(log.id)}
                                            className={`w-full p-2 text-left text-sm border rounded transition-colors ${
                                                exercise.accessedEvidenceIds.includes(log.id)
                                                    ? 'border-green-500/30 bg-green-500/5'
                                                    : 'border-border bg-secondary/30 hover:border-blue-500/50'
                                            }`}
                                        >
                                            <div className="font-medium truncate">{log.title}</div>
                                            <div className="text-xs text-muted-foreground">{log.source}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Visibility Gaps (if available) */}
                        {socLayer?.visibilityGaps && socLayer.visibilityGaps.length > 0 && (
                            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                <h5 className="font-medium mb-2 text-yellow-400 text-sm">Visibility Gaps</h5>
                                <div className="space-y-1 text-xs">
                                    {socLayer.visibilityGaps.map((gap, idx) => (
                                        <div key={idx} className="text-muted-foreground">
                                            {gap.area}: {gap.description}
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

export default SOCIRView;
