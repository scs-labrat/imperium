/**
 * ScoringService - Real-time scoring and post-exercise analytics
 *
 * Tracks:
 * - Decision quality and timing
 * - Evidence access patterns
 * - Notification deadline compliance
 * - Safety chain violations
 * - Role collaboration
 */

import type {
    ExerciseState,
    ExerciseScore,
    CategoryScore,
    MetricResult,
    DriftAnalytics,
    ScoringRubric,
    Decision,
    SyntheticEvidence,
    NotificationClock,
} from '../../types/iso';

import {
    ISORole,
    EvidenceType,
} from '../../types/iso';

export interface ScoringEvent {
    type: 'decision' | 'evidence_access' | 'inject_release' | 'time_advance' | 'role_switch';
    timestamp: string;
    scenarioTimeMinutes: number;
    data: Record<string, unknown>;
}

interface DecisionAnalysis {
    decisionId: string;
    timeToDecisionSeconds: number;
    evidenceConsideredCount: number;
    evidenceAvailableCount: number;
    wasOptimal: boolean;
    consequenceScore: number;
}

class ScoringService {
    /**
     * Update live scoring based on a scoring event
     */
    updateLiveScore(
        state: ExerciseState,
        event: ScoringEvent
    ): Partial<ExerciseScore> {
        const currentLive = state.liveScoring || {};

        switch (event.type) {
            case 'decision':
                return this.scoreDecisionEvent(state, event, currentLive);
            case 'evidence_access':
                return this.scoreEvidenceAccessEvent(state, event, currentLive);
            case 'time_advance':
                return this.scoreTimeAdvanceEvent(state, event, currentLive);
            default:
                return currentLive;
        }
    }

    /**
     * Calculate the final score after exercise completion
     */
    calculateFinalScore(state: ExerciseState): ExerciseScore {
        const rubric = state.compiledScenario.scoringRubric;
        const driftAnalytics = this.generateDriftAnalytics(state);

        // Calculate each category
        const categoryScores = rubric.categories.map(category =>
            this.calculateCategoryScore(state, category, driftAnalytics)
        );

        // Calculate metric results
        const metricResults = this.calculateMetricResults(state, rubric, driftAnalytics);

        // Sum up total score
        const totalScore = categoryScores.reduce((sum, cs) => sum + cs.score, 0);
        const maxPossibleScore = rubric.maxScore;
        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        return {
            exerciseId: state.id,
            totalScore,
            maxPossibleScore,
            percentage,
            passFail: percentage >= rubric.passingThreshold ? 'pass' : 'fail',
            categoryScores,
            metricResults,
            driftAnalytics,
        };
    }

    /**
     * Generate drift analytics from exercise state
     */
    generateDriftAnalytics(state: ExerciseState): DriftAnalytics {
        // Calculate escalation delay
        const escalationDelaySeconds = this.calculateEscalationDelay(state);

        // Calculate average decision time
        const averageDecisionTimeSeconds = this.calculateAverageDecisionTime(state);

        // Calculate evidence neglect rate
        const evidenceNeglectRate = this.calculateEvidenceNeglectRate(state);

        // Count safety bypasses
        const safetyBypasses = this.countSafetyBypasses(state);

        // Count policy violations
        const policyViolations = this.countPolicyViolations(state);

        // Count communication gaps
        const communicationGaps = this.countCommunicationGaps(state);

        // Count missed deadlines
        const missedDeadlines = this.countMissedDeadlines(state);

        // Calculate role collaboration score
        const roleCollaborationScore = this.calculateRoleCollaborationScore(state);

        return {
            escalationDelaySeconds,
            averageDecisionTimeSeconds,
            evidenceNeglectRate,
            safetyBypasses,
            policyViolations,
            communicationGaps,
            missedDeadlines,
            roleCollaborationScore,
        };
    }

    // ============================================================
    // PRIVATE: Event Scoring
    // ============================================================

    private scoreDecisionEvent(
        state: ExerciseState,
        event: ScoringEvent,
        currentLive: Partial<ExerciseScore>
    ): Partial<ExerciseScore> {
        const decision = event.data.decision as Decision;
        if (!decision) return currentLive;

        // Find the expected decision and selected option
        const inject = state.compiledScenario.injects.find(i => i.id === decision.injectId);
        const expectedDecision = inject?.expectedDecisions.find(ed => ed.id === decision.expectedDecisionId);
        const selectedOption = expectedDecision?.options.find(o => o.id === decision.selectedOptionId);

        if (!selectedOption) return currentLive;

        // Analyze decision quality
        const analysis = this.analyzeDecision(state, decision, inject);

        // Update running metrics
        const currentMetrics = currentLive.metricResults || [];
        const decisionMetric: MetricResult = {
            metricId: `decision_${decision.id}`,
            metricName: `Decision: ${expectedDecision?.prompt || 'Unknown'}`,
            measuredValue: analysis.timeToDecisionSeconds,
            score: analysis.consequenceScore,
            maxScore: 100,
            notes: analysis.wasOptimal ? 'Optimal decision' : 'Suboptimal decision',
        };

        return {
            ...currentLive,
            metricResults: [...currentMetrics, decisionMetric],
        };
    }

    private scoreEvidenceAccessEvent(
        state: ExerciseState,
        event: ScoringEvent,
        currentLive: Partial<ExerciseScore>
    ): Partial<ExerciseScore> {
        const evidenceId = event.data.evidenceId as string;
        const allEvidence = this.getAllEvidence(state);
        const accessedCount = state.accessedEvidenceIds.length;
        const totalRelevant = allEvidence.filter(e =>
            e.visibleToRoles.includes(state.currentRole)
        ).length;

        // Update drift analytics
        const currentDrift = currentLive.driftAnalytics || {
            escalationDelaySeconds: 0,
            averageDecisionTimeSeconds: 0,
            evidenceNeglectRate: 0,
            safetyBypasses: 0,
            policyViolations: 0,
            communicationGaps: 0,
            missedDeadlines: 0,
            roleCollaborationScore: 0,
        };

        return {
            ...currentLive,
            driftAnalytics: {
                ...currentDrift,
                evidenceNeglectRate: totalRelevant > 0
                    ? ((totalRelevant - accessedCount) / totalRelevant) * 100
                    : 0,
            },
        };
    }

    private scoreTimeAdvanceEvent(
        state: ExerciseState,
        event: ScoringEvent,
        currentLive: Partial<ExerciseScore>
    ): Partial<ExerciseScore> {
        // Check for missed deadlines
        const missedDeadlines = this.countMissedDeadlines(state);

        const currentDrift = currentLive.driftAnalytics || {
            escalationDelaySeconds: 0,
            averageDecisionTimeSeconds: 0,
            evidenceNeglectRate: 0,
            safetyBypasses: 0,
            policyViolations: 0,
            communicationGaps: 0,
            missedDeadlines: 0,
            roleCollaborationScore: 0,
        };

        return {
            ...currentLive,
            driftAnalytics: {
                ...currentDrift,
                missedDeadlines,
            },
        };
    }

    // ============================================================
    // PRIVATE: Category Scoring
    // ============================================================

    private calculateCategoryScore(
        state: ExerciseState,
        category: { id: string; name: string; weight: number; metrics: any[] },
        driftAnalytics: DriftAnalytics
    ): CategoryScore {
        let categoryScore = 0;
        let maxCategoryScore = 0;

        for (const metric of category.metrics) {
            const result = this.evaluateMetric(state, metric, driftAnalytics);
            categoryScore += result.score;
            maxCategoryScore += metric.maxScore;
        }

        // Apply category weight
        const weightedScore = (categoryScore / Math.max(maxCategoryScore, 1)) * category.weight;

        return {
            categoryId: category.id,
            categoryName: category.name,
            score: weightedScore,
            maxScore: category.weight,
            percentage: maxCategoryScore > 0 ? (categoryScore / maxCategoryScore) * 100 : 0,
        };
    }

    private calculateMetricResults(
        state: ExerciseState,
        rubric: ScoringRubric,
        driftAnalytics: DriftAnalytics
    ): MetricResult[] {
        const results: MetricResult[] = [];

        for (const category of rubric.categories) {
            for (const metric of category.metrics) {
                const result = this.evaluateMetric(state, metric, driftAnalytics);
                results.push(result);
            }
        }

        return results;
    }

    private evaluateMetric(
        state: ExerciseState,
        metric: { id: string; name: string; measurementType: string; targetValue?: number; maxScore: number; penaltyPerUnit?: number },
        driftAnalytics: DriftAnalytics
    ): MetricResult {
        let measuredValue = 0;
        let score = metric.maxScore;
        let notes = '';

        switch (metric.id) {
            case 'escalation_time':
                measuredValue = driftAnalytics.escalationDelaySeconds;
                if (metric.targetValue && measuredValue > metric.targetValue) {
                    const penalty = (measuredValue - metric.targetValue) * (metric.penaltyPerUnit || 1);
                    score = Math.max(0, metric.maxScore - penalty);
                    notes = `Escalation delayed by ${measuredValue - metric.targetValue}s`;
                } else {
                    notes = 'Escalation within target time';
                }
                break;

            case 'decision_speed':
                measuredValue = driftAnalytics.averageDecisionTimeSeconds;
                if (metric.targetValue && measuredValue > metric.targetValue) {
                    const penalty = (measuredValue - metric.targetValue) * (metric.penaltyPerUnit || 0.5);
                    score = Math.max(0, metric.maxScore - penalty);
                    notes = `Average decision time ${measuredValue}s (target: ${metric.targetValue}s)`;
                } else {
                    notes = 'Decision speed within target';
                }
                break;

            case 'evidence_coverage':
                measuredValue = 100 - driftAnalytics.evidenceNeglectRate;
                score = (measuredValue / 100) * metric.maxScore;
                notes = `${measuredValue.toFixed(1)}% of evidence reviewed`;
                break;

            case 'safety_compliance':
                measuredValue = driftAnalytics.safetyBypasses;
                score = Math.max(0, metric.maxScore - (measuredValue * (metric.penaltyPerUnit || 10)));
                notes = measuredValue === 0 ? 'No safety bypasses' : `${measuredValue} safety bypass(es)`;
                break;

            case 'deadline_compliance':
                measuredValue = driftAnalytics.missedDeadlines;
                score = Math.max(0, metric.maxScore - (measuredValue * (metric.penaltyPerUnit || 15)));
                notes = measuredValue === 0 ? 'All deadlines met' : `${measuredValue} deadline(s) missed`;
                break;

            case 'collaboration':
                measuredValue = driftAnalytics.roleCollaborationScore;
                score = (measuredValue / 100) * metric.maxScore;
                notes = `Collaboration score: ${measuredValue}%`;
                break;

            default:
                notes = 'Unknown metric';
        }

        return {
            metricId: metric.id,
            metricName: metric.name,
            measuredValue,
            targetValue: metric.targetValue,
            score,
            maxScore: metric.maxScore,
            notes,
        };
    }

    // ============================================================
    // PRIVATE: Analytics Calculations
    // ============================================================

    private analyzeDecision(
        state: ExerciseState,
        decision: Decision,
        inject: any
    ): DecisionAnalysis {
        const expectedDecision = inject?.expectedDecisions?.find(
            (ed: any) => ed.id === decision.expectedDecisionId
        );
        const selectedOption = expectedDecision?.options?.find(
            (o: any) => o.id === decision.selectedOptionId
        );

        // Calculate time to decision (from inject release to decision)
        const injectReleasedAt = inject?.releasedAt;
        const decisionAt = decision.timestamp;
        let timeToDecisionSeconds = 0;

        if (injectReleasedAt && decisionAt) {
            timeToDecisionSeconds =
                (new Date(decisionAt).getTime() - new Date(injectReleasedAt).getTime()) / 1000;
        }

        // Count evidence considered
        const evidenceConsideredCount = decision.evidenceConsideredIds?.length || 0;
        const evidenceAvailableCount = inject?.evidenceIds?.length || 0;

        // Determine if decision was optimal based on consequence score
        const consequenceScore = selectedOption?.consequenceScore || 50;
        const maxConsequenceScore = Math.max(
            ...((expectedDecision?.options || []).map((o: any) => o.consequenceScore || 0))
        );
        const wasOptimal = consequenceScore >= maxConsequenceScore;

        return {
            decisionId: decision.id,
            timeToDecisionSeconds,
            evidenceConsideredCount,
            evidenceAvailableCount,
            wasOptimal,
            consequenceScore,
        };
    }

    private calculateEscalationDelay(state: ExerciseState): number {
        // Find the first critical inject and when escalation decision was made
        const criticalInjects = state.compiledScenario.injects.filter(
            i => i.urgency === 'critical'
        );

        if (criticalInjects.length === 0) return 0;

        const firstCritical = criticalInjects[0];
        const escalationDecision = state.decisions.find(d =>
            d.injectId === firstCritical.id
        );

        if (!escalationDecision) {
            // No escalation decision made - calculate from inject release to now
            if (state.releasedInjectIds.includes(firstCritical.id)) {
                return state.scenarioTimeMinutes * 60 - firstCritical.scheduledTimeMinutes * 60;
            }
            return 0;
        }

        // Calculate delay from inject scheduled time to decision
        return (escalationDecision.scenarioTimeMinutes - firstCritical.scheduledTimeMinutes) * 60;
    }

    private calculateAverageDecisionTime(state: ExerciseState): number {
        if (state.decisions.length === 0) return 0;

        const decisionTimes = state.decisions.map(decision => {
            const inject = state.compiledScenario.injects.find(i => i.id === decision.injectId);
            if (!inject) return 0;
            return (decision.scenarioTimeMinutes - inject.scheduledTimeMinutes) * 60;
        });

        const sum = decisionTimes.reduce((a, b) => a + b, 0);
        return sum / decisionTimes.length;
    }

    private calculateEvidenceNeglectRate(state: ExerciseState): number {
        const allEvidence = this.getAllEvidence(state);
        const criticalEvidence = allEvidence.filter(e =>
            e.integrity === 'verified' || e.type === EvidenceType.ALERT
        );

        if (criticalEvidence.length === 0) return 0;

        const accessedCritical = criticalEvidence.filter(e =>
            state.accessedEvidenceIds.includes(e.id)
        );

        return ((criticalEvidence.length - accessedCritical.length) / criticalEvidence.length) * 100;
    }

    private countSafetyBypasses(state: ExerciseState): number {
        // Count decisions that involve bypassing safety chains
        return state.decisions.filter(d => {
            const inject = state.compiledScenario.injects.find(i => i.id === d.injectId);
            const expectedDecision = inject?.expectedDecisions.find(ed => ed.id === d.expectedDecisionId);
            const option = expectedDecision?.options.find(o => o.id === d.selectedOptionId);

            // Check if this option involves safety bypass based on consequence text and impact areas
            const hasSafetyImpact = option?.impactAreas?.includes('Safety') || false;
            const consequenceIndicatesBypass = option?.consequence?.toLowerCase().includes('bypass') || false;
            return hasSafetyImpact && consequenceIndicatesBypass;
        }).length;
    }

    private countPolicyViolations(state: ExerciseState): number {
        // Count decisions that violate policy
        return state.decisions.filter(d => {
            const inject = state.compiledScenario.injects.find(i => i.id === d.injectId);
            const expectedDecision = inject?.expectedDecisions.find(ed => ed.id === d.expectedDecisionId);
            const option = expectedDecision?.options.find(o => o.id === d.selectedOptionId);

            // Check if this option violates compliance based on consequence text and impact areas
            const hasComplianceImpact = option?.impactAreas?.includes('Compliance') || false;
            const consequenceIndicatesViolation = option?.consequence?.toLowerCase().includes('violation') || false;
            return hasComplianceImpact && consequenceIndicatesViolation;
        }).length;
    }

    private countCommunicationGaps(state: ExerciseState): number {
        // Count injects targeting Legal_Comms that weren't addressed
        const legalInjects = state.compiledScenario.injects.filter(i =>
            i.targetRoles.includes(ISORole.LEGAL_COMMS) &&
            state.releasedInjectIds.includes(i.id)
        );

        const addressedInjects = legalInjects.filter(i =>
            state.decisions.some(d => d.injectId === i.id)
        );

        return legalInjects.length - addressedInjects.length;
    }

    private countMissedDeadlines(state: ExerciseState): number {
        const clocks = Object.values(state.notificationClockStates);

        // Count clocks that are overdue (deadline passed without being met)
        return clocks.filter(clock => clock.status === 'overdue').length;
    }

    private calculateRoleCollaborationScore(state: ExerciseState): number {
        // In single-user MVP, collaboration is measured by role-switching frequency
        // and evidence sharing patterns

        // For now, base it on evidence access coverage across roles
        const allEvidence = this.getAllEvidence(state);
        const roleEvidence: Record<string, SyntheticEvidence[]> = {};

        for (const ev of allEvidence) {
            for (const role of ev.visibleToRoles) {
                if (!roleEvidence[role]) roleEvidence[role] = [];
                roleEvidence[role].push(ev);
            }
        }

        // Calculate what percentage of each role's evidence was accessed
        let totalAccess = 0;
        let roleCount = 0;

        for (const [role, evidence] of Object.entries(roleEvidence)) {
            const accessedCount = evidence.filter(e =>
                state.accessedEvidenceIds.includes(e.id)
            ).length;
            totalAccess += evidence.length > 0 ? accessedCount / evidence.length : 0;
            roleCount++;
        }

        return roleCount > 0 ? (totalAccess / roleCount) * 100 : 0;
    }

    private getAllEvidence(state: ExerciseState): SyntheticEvidence[] {
        const evidence: SyntheticEvidence[] = [];
        const layers = state.compiledScenario;

        // Collect from all layers
        if (layers.socIrLayer?.syntheticLogs) {
            evidence.push(...layers.socIrLayer.syntheticLogs);
        }
        if (layers.socIrLayer?.alertArtifacts) {
            evidence.push(...layers.socIrLayer.alertArtifacts);
        }

        // Get evidence from injects
        for (const inject of layers.injects) {
            if (inject.evidenceIds) {
                // Evidence IDs reference evidence that should be in one of the layers
                // This is tracked separately
            }
        }

        return evidence;
    }
}

export const scoringService = new ScoringService();
export default ScoringService;
