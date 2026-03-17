import { StartupPlan, Task, TaskProgress } from './planUtils';

export interface ExecutionMetrics {
    progressPercent: number;
    validationScore: number;
    buildProgress: number;
    userTestingProgress: number;
    launchReadiness: number;
    learningVelocity: number;
}

export const computePlanMetrics = (plan: StartupPlan, progress: TaskProgress): ExecutionMetrics => {
    // 1. Get all tasks
    const allTasks = (plan.phases || []).flatMap(p => (p.days || []).flatMap(d => (d.tasks || [])));

    if (allTasks.length === 0) {
        return {
            progressPercent: 0,
            validationScore: 0,
            buildProgress: 0,
            userTestingProgress: 0,
            launchReadiness: 0,
            learningVelocity: 0
        };
    }

    // 2. Filter by phase/category
    const completedTasks = allTasks.filter(t => progress[t.id]?.completed);

    const validationTasks = allTasks.filter(t => t.phase === 'Validation');
    const buildTasks = allTasks.filter(t => t.phase === 'Build');
    const launchTasks = allTasks.filter(t => t.phase === 'Launch' || t.phase === 'Scale');

    // 3. Compute scores
    const calcScore = (subset: Task[]) => {
        if (subset.length === 0) return 0;
        const done = subset.filter(t => progress[t.id]?.completed).length;
        return (done / subset.length) * 100;
    };

    // Special category matches
    const userTestingTasks = allTasks.filter(t =>
        (t.title || "").toLowerCase().includes('user') ||
        (t.title || "").toLowerCase().includes('interview') ||
        (t.category || "").toLowerCase().includes('validation')
    );

    return {
        progressPercent: calcScore(allTasks),
        validationScore: calcScore(validationTasks),
        buildProgress: calcScore(buildTasks),
        userTestingProgress: calcScore(userTestingTasks),
        launchReadiness: calcScore(launchTasks),
        learningVelocity: Math.min(100, (completedTasks.length / (plan.currentDay || 1)) * 20)
    };
};
