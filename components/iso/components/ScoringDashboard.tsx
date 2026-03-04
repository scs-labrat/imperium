import React, { useState } from 'react';
import {
    XIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    ClockIcon,
    TrendingUpIcon,
    ShieldIcon,
    EyeIcon,
    UsersIcon,
    FileTextIcon,
    ActivityIcon,
} from '../../icons';
import type {
    ExerciseScore,
    CategoryScore,
    MetricResult,
    DriftAnalyticsData,
} from '../../../types';

interface ScoringDashboardProps {
    score: ExerciseScore;
    onClose: () => void;
    onExportReport?: () => void;
}

const ScoringDashboard: React.FC<ScoringDashboardProps> = ({
    score,
    onClose,
    onExportReport,
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'metrics' | 'drift'>('overview');

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-400';
        if (percentage >= 60) return 'text-yellow-400';
        if (percentage >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBg = (percentage: number) => {
        if (percentage >= 80) return 'bg-green-500/20';
        if (percentage >= 60) return 'bg-yellow-500/20';
        if (percentage >= 40) return 'bg-orange-500/20';
        return 'bg-red-500/20';
    };

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds.toFixed(0)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg w-[900px] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${score.passFail === 'pass' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {score.passFail === 'pass' ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertTriangleIcon className="w-6 h-6 text-red-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Exercise Scoring Report</h2>
                            <p className="text-sm text-muted-foreground">
                                {score.passFail === 'pass' ? 'Exercise Passed' : 'Exercise Failed'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onExportReport && (
                            <button
                                onClick={onExportReport}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                            >
                                Export Report
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-secondary rounded"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Score Summary */}
                <div className="p-4 border-b border-border bg-secondary/30">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getScoreColor(score.percentage)}`}>
                                {score.percentage.toFixed(0)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Score</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-semibold">
                                {score.totalScore.toFixed(0)}/{score.maxPossibleScore}
                            </div>
                            <div className="text-sm text-muted-foreground">Points Earned</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-semibold">
                                {score.categoryScores.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Categories</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-semibold ${score.passFail === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                {score.passFail.toUpperCase()}
                            </div>
                            <div className="text-sm text-muted-foreground">Result</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border flex">
                    {(['overview', 'categories', 'metrics', 'drift'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm capitalize transition-colors ${
                                activeTab === tab
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab === 'drift' ? 'Drift Analytics' : tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            score={score}
                            getScoreColor={getScoreColor}
                            getScoreBg={getScoreBg}
                            formatTime={formatTime}
                        />
                    )}
                    {activeTab === 'categories' && (
                        <CategoriesTab
                            categories={score.categoryScores}
                            getScoreColor={getScoreColor}
                            getScoreBg={getScoreBg}
                        />
                    )}
                    {activeTab === 'metrics' && (
                        <MetricsTab
                            metrics={score.metricResults}
                            getScoreColor={getScoreColor}
                        />
                    )}
                    {activeTab === 'drift' && (
                        <DriftTab
                            drift={score.driftAnalytics}
                            formatTime={formatTime}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Tab Components

interface OverviewTabProps {
    score: ExerciseScore;
    getScoreColor: (p: number) => string;
    getScoreBg: (p: number) => string;
    formatTime: (s: number) => string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ score, getScoreColor, getScoreBg, formatTime }) => {
    const drift = score.driftAnalytics;

    return (
        <div className="space-y-6">
            {/* Category Summary */}
            <div>
                <h3 className="text-sm font-medium mb-3">Category Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                    {score.categoryScores.map(cat => (
                        <div
                            key={cat.categoryId}
                            className={`p-3 rounded-lg border border-border ${getScoreBg(cat.percentage)}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{cat.categoryName}</span>
                                <span className={`font-semibold ${getScoreColor(cat.percentage)}`}>
                                    {cat.percentage.toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        cat.percentage >= 80 ? 'bg-green-500' :
                                        cat.percentage >= 60 ? 'bg-yellow-500' :
                                        cat.percentage >= 40 ? 'bg-orange-500' :
                                        'bg-red-500'
                                    }`}
                                    style={{ width: `${cat.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Key Drift Metrics */}
            <div>
                <h3 className="text-sm font-medium mb-3">Key Performance Indicators</h3>
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-muted-foreground">Avg Decision Time</span>
                        </div>
                        <div className="text-lg font-semibold">
                            {formatTime(drift.averageDecisionTimeSeconds)}
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <EyeIcon className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-muted-foreground">Evidence Coverage</span>
                        </div>
                        <div className="text-lg font-semibold">
                            {(100 - drift.evidenceNeglectRate).toFixed(0)}%
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldIcon className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-muted-foreground">Safety Bypasses</span>
                        </div>
                        <div className={`text-lg font-semibold ${drift.safetyBypasses > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.safetyBypasses}
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangleIcon className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">Missed Deadlines</span>
                        </div>
                        <div className={`text-lg font-semibold ${drift.missedDeadlines > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.missedDeadlines}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Assessment Summary</h3>
                <p className="text-sm text-muted-foreground">
                    {score.passFail === 'pass' ? (
                        <>
                            The exercise was completed successfully with a score of {score.percentage.toFixed(0)}%.
                            {drift.safetyBypasses === 0 && drift.missedDeadlines === 0 &&
                                ' No safety violations or missed deadlines were recorded.'}
                            {drift.roleCollaborationScore >= 70 &&
                                ' Strong cross-role collaboration was demonstrated.'}
                        </>
                    ) : (
                        <>
                            The exercise did not meet the passing threshold. Key areas for improvement include:
                            {drift.missedDeadlines > 0 && ` Deadline management (${drift.missedDeadlines} missed),`}
                            {drift.safetyBypasses > 0 && ` Safety compliance (${drift.safetyBypasses} bypasses),`}
                            {drift.evidenceNeglectRate > 30 && ` Evidence review (${drift.evidenceNeglectRate.toFixed(0)}% neglected).`}
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

interface CategoriesTabProps {
    categories: CategoryScore[];
    getScoreColor: (p: number) => string;
    getScoreBg: (p: number) => string;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, getScoreColor, getScoreBg }) => (
    <div className="space-y-4">
        {categories.map(cat => (
            <div
                key={cat.categoryId}
                className="p-4 border border-border rounded-lg"
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className="font-medium">{cat.categoryName}</h4>
                        <p className="text-sm text-muted-foreground">
                            Weight: {cat.maxScore} points
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(cat.percentage)}`}>
                            {cat.percentage.toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {cat.score.toFixed(1)} / {cat.maxScore} pts
                        </div>
                    </div>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${
                            cat.percentage >= 80 ? 'bg-green-500' :
                            cat.percentage >= 60 ? 'bg-yellow-500' :
                            cat.percentage >= 40 ? 'bg-orange-500' :
                            'bg-red-500'
                        }`}
                        style={{ width: `${cat.percentage}%` }}
                    />
                </div>
            </div>
        ))}
    </div>
);

interface MetricsTabProps {
    metrics: MetricResult[];
    getScoreColor: (p: number) => string;
}

const MetricsTab: React.FC<MetricsTabProps> = ({ metrics, getScoreColor }) => (
    <div className="space-y-2">
        <div className="grid grid-cols-[1fr,100px,100px,1fr] gap-4 p-2 bg-secondary/50 rounded text-xs font-medium text-muted-foreground">
            <div>Metric</div>
            <div className="text-right">Measured</div>
            <div className="text-right">Score</div>
            <div>Notes</div>
        </div>
        {metrics.map(metric => {
            const percentage = metric.maxScore > 0 ? (metric.score / metric.maxScore) * 100 : 0;
            return (
                <div
                    key={metric.metricId}
                    className="grid grid-cols-[1fr,100px,100px,1fr] gap-4 p-3 border border-border rounded items-center"
                >
                    <div>
                        <div className="font-medium text-sm">{metric.metricName}</div>
                        {metric.targetValue !== undefined && (
                            <div className="text-xs text-muted-foreground">
                                Target: {metric.targetValue}
                            </div>
                        )}
                    </div>
                    <div className="text-right font-mono text-sm">
                        {typeof metric.measuredValue === 'number'
                            ? metric.measuredValue.toFixed(1)
                            : metric.measuredValue}
                    </div>
                    <div className={`text-right font-semibold ${getScoreColor(percentage)}`}>
                        {metric.score.toFixed(0)}/{metric.maxScore}
                    </div>
                    <div className="text-sm text-muted-foreground">{metric.notes}</div>
                </div>
            );
        })}
    </div>
);

interface DriftTabProps {
    drift: DriftAnalyticsData;
    formatTime: (s: number) => string;
}

const DriftTab: React.FC<DriftTabProps> = ({ drift, formatTime }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            {/* Timing Metrics */}
            <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-blue-400" />
                    Timing Analysis
                </h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Escalation Delay</span>
                        <span className="font-mono">{formatTime(drift.escalationDelaySeconds)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Decision Time</span>
                        <span className="font-mono">{formatTime(drift.averageDecisionTimeSeconds)}</span>
                    </div>
                </div>
            </div>

            {/* Evidence Metrics */}
            <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <EyeIcon className="w-4 h-4 text-purple-400" />
                    Evidence Analysis
                </h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Evidence Neglect Rate</span>
                        <span className={`font-mono ${drift.evidenceNeglectRate > 30 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.evidenceNeglectRate.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className={`h-full ${drift.evidenceNeglectRate > 30 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${100 - drift.evidenceNeglectRate}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Compliance Metrics */}
            <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ShieldIcon className="w-4 h-4 text-green-400" />
                    Compliance
                </h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Safety Bypasses</span>
                        <span className={`font-mono ${drift.safetyBypasses > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.safetyBypasses}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Policy Violations</span>
                        <span className={`font-mono ${drift.policyViolations > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.policyViolations}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Missed Deadlines</span>
                        <span className={`font-mono ${drift.missedDeadlines > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {drift.missedDeadlines}
                        </span>
                    </div>
                </div>
            </div>

            {/* Collaboration Metrics */}
            <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-cyan-400" />
                    Collaboration
                </h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Communication Gaps</span>
                        <span className={`font-mono ${drift.communicationGaps > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {drift.communicationGaps}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Collaboration Score</span>
                        <span className="font-mono">{drift.roleCollaborationScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-500"
                            style={{ width: `${drift.roleCollaborationScore}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Drift Interpretation */}
        <div className="p-4 bg-secondary/30 rounded-lg">
            <h4 className="font-medium mb-2">Drift Analysis Summary</h4>
            <p className="text-sm text-muted-foreground">
                {drift.escalationDelaySeconds > 300 && (
                    <span className="block mb-1">
                        Escalation delay of {formatTime(drift.escalationDelaySeconds)} indicates potential hesitation in critical decision-making.
                    </span>
                )}
                {drift.evidenceNeglectRate > 30 && (
                    <span className="block mb-1">
                        {drift.evidenceNeglectRate.toFixed(0)}% of available evidence was not reviewed, which may have impacted decision quality.
                    </span>
                )}
                {drift.safetyBypasses > 0 && (
                    <span className="block mb-1">
                        {drift.safetyBypasses} safety bypass action(s) were taken - review if these were justified.
                    </span>
                )}
                {drift.roleCollaborationScore < 50 && (
                    <span className="block mb-1">
                        Cross-role collaboration score of {drift.roleCollaborationScore.toFixed(0)}% suggests siloed decision-making.
                    </span>
                )}
                {drift.escalationDelaySeconds <= 300 && drift.evidenceNeglectRate <= 30 &&
                 drift.safetyBypasses === 0 && drift.roleCollaborationScore >= 50 && (
                    <span>Performance metrics indicate effective incident response practices.</span>
                )}
            </p>
        </div>
    </div>
);

export default ScoringDashboard;
