import { StartupPlan, TaskProgress } from './planUtils';
import { ExecutionMetrics } from './metricsEngine';

export const deriveStrategyFromMetrics = (plan: StartupPlan, metrics: ExecutionMetrics): Partial<StartupPlan> => {
    // 1. Update KPIs
    const updatedKPIs = (plan.kpis || []).map(kpi => {
        const name = (kpi.name || "").toLowerCase();
        if (name.includes('interview') || name.includes('user')) {
            // Target is usually 10 for interviews in default plan
            return { ...kpi, value: Math.round((metrics.userTestingProgress / 100) * kpi.target) };
        }
        if (name.includes('validation') || name.includes('readiness')) {
            return { ...kpi, value: Math.round(metrics.validationScore) };
        }
        if (name.includes('build') || name.includes('progress') || name.includes('mvp')) {
            return { ...kpi, value: Math.round(metrics.buildProgress) };
        }
        if (name.includes('signup') || name.includes('waitlist')) {
            // Signups can be inferred from launch readiness or just scaled validation
            return { ...kpi, value: Math.round((metrics.validationScore / 100) * kpi.target * 0.5) };
        }
        return kpi;
    });

    // 2. Update OKRs
    const updatedOKRs = (plan.okrs || []).map(okr => ({
        ...okr,
        keyResults: (okr.keyResults || []).map(kr => {
            const title = (kr.title || "").toLowerCase();
            if (title.includes('interview')) {
                return { ...kr, currentValue: Math.round((metrics.userTestingProgress / 100) * kr.targetValue) };
            }
            if (title.includes('validation') || title.includes('score')) {
                return { ...kr, currentValue: Math.round(metrics.validationScore) };
            }
            if (title.includes('build') || title.includes('mvp') || title.includes('feature')) {
                return { ...kr, currentValue: Math.round((metrics.buildProgress / 100) * kr.targetValue) };
            }
            return kr;
        })
    }));

    // 3. Update Sprints
    const updatedSprints = (plan.sprints || []).map(sprint => {
        // Simple logic: A week is ~7 days.
        const startDay = (sprint.weekNumber - 1) * 7 + 1;
        const endDay = sprint.weekNumber * 7;

        // Find if all days in this week are completed
        const sprintDays = plan.phases.flatMap(p => p.days).filter(d => d.dayNumber >= startDay && d.dayNumber <= endDay);
        const allCompleted = sprintDays.length > 0 && sprintDays.every(d => d.status === 'completed');

        return { ...sprint, completed: allCompleted };
    });

    // 4. Update Risks
    const updatedRisks = (plan.risks || []).map(risk => {
        const desc = (risk.description || "").toLowerCase();
        if (desc.includes('validation') && metrics.validationScore > 70) {
            return { ...risk, resolved: true };
        }
        if (desc.includes('build') && metrics.buildProgress > 80) {
            return { ...risk, resolved: true };
        }
        return risk;
    });

    // 5. Update Assumptions
    const updatedAssumptions = (plan.assumptions || []).map(assumption => {
        const stmt = (assumption.statement || "").toLowerCase();
        if (stmt.includes('experience') || stmt.includes('market')) {
            if (metrics.validationScore > 60) return { ...assumption, validated: true };
        }
        if (metrics.validationScore > 80) return { ...assumption, validated: true };
        return assumption;
    });

    return {
        kpis: updatedKPIs,
        okrs: updatedOKRs,
        sprints: updatedSprints,
        risks: updatedRisks,
        assumptions: updatedAssumptions,
        overallProgress: Math.round(metrics.progressPercent)
    };
};
