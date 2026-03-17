import { v4 as uuidv4 } from 'uuid';

export interface ExecutionStep {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: "High" | "Medium" | "Low";
    status: "locked" | "available" | "completed";
    dependsOn?: string[];
    estimated_days: number;
    phase: "Validation" | "Build" | "Launch" | "Scale";
    objective: string;
    deliverable: string;
    kpiImpact: string;
    steps: ExecutionStep[];
}

export type DayStatus = "locked" | "active" | "completed";

export interface DayPlan {
    id: string; // Stable ID
    dayNumber: number;
    date?: string; // ISO date string
    objective: string;
    tasks: Task[];
    status: DayStatus;
    kpiTarget?: string;
    notes?: string;
    isCompleted: boolean; // Deprecated in favor of status === 'completed', kept for backward compat if needed or just synced
}

export interface Phase {
    id: string;
    name: "Validation" | "Build" | "Launch" | "Scale";
    startDay: number;
    endDay: number;
    days: DayPlan[];
}

export interface KeyResult {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
}

export interface OKR {
    id: string;
    objective: string;
    keyResults: KeyResult[];
}

export interface KPI {
    id: string;
    name: string;
    value: number;
    target: number;
}

export interface RiskItem {
    id: string;
    description: string;
    impact: "low" | "medium" | "high";
    mitigation: string;
    resolved: boolean;
}

export interface Assumption {
    id: string;
    statement: string;
    validated: boolean;
    notes: string;
}

export interface Sprint {
    id: string;
    weekNumber: number;
    goal: string;
    completed: boolean;
}

export interface KeyResult {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
}

export interface OKR {
    id: string;
    objective: string;
    keyResults: KeyResult[];
}

export interface KPI {
    id: string;
    name: string;
    value: number;
    target: number;
}

export interface RiskItem {
    id: string;
    description: string;
    impact: "low" | "medium" | "high";
    mitigation: string;
    resolved: boolean;
}

export interface Assumption {
    id: string;
    statement: string;
    validated: boolean;
    notes: string;
}

export interface Sprint {
    id: string;
    weekNumber: number;
    goal: string;
    completed: boolean;
}

export interface StartupPlan {
    id: string;
    title: string;
    summary: string;
    totalDays: number;
    currentDay: number; // 1-based index
    phases: Phase[];
    overallProgress: number; // 0-100
    startDate: string; // ISO date
    lastOpened: string; // ISO date
    lastActiveDate: string | null; // ISO date for streak calculation
    streak: number;

    // Startup OS Layers
    okrs: OKR[];
    kpis: KPI[];
    risks: RiskItem[];
    assumptions: Assumption[];
    sprints: Sprint[];
}

export interface TaskProgress {
    [taskId: string]: {
        completed: boolean;
        updatedAt: number;
        steps?: { [stepId: string]: boolean };
        notes?: string;
        guide_data?: any;
    }
}

// Helper to calculate phase ranges based on total days
export const calculatePhaseRanges = (totalDays: number) => {
    let validationDays, buildDays, launchDays, scaleDays = 0;

    if (totalDays <= 10) {
        validationDays = Math.floor(totalDays * 0.4);
        buildDays = Math.floor(totalDays * 0.4);
        launchDays = totalDays - validationDays - buildDays;
    } else if (totalDays <= 30) {
        validationDays = Math.floor(totalDays * 0.3);
        buildDays = Math.floor(totalDays * 0.5);
        launchDays = totalDays - validationDays - buildDays;
    } else {
        validationDays = Math.floor(totalDays * 0.25);
        buildDays = Math.floor(totalDays * 0.50);
        launchDays = Math.floor(totalDays * 0.20);
        scaleDays = totalDays - validationDays - buildDays - launchDays;
    }

    return {
        Validation: { start: 1, end: validationDays },
        Build: { start: validationDays + 1, end: validationDays + buildDays },
        Launch: { start: validationDays + buildDays + 1, end: validationDays + buildDays + launchDays },
        Scale: scaleDays > 0 ? { start: validationDays + buildDays + launchDays + 1, end: totalDays } : null
    };
};

export const generateFullPlan = (
    aiResponse: { title: string; summary: string; tasks: any[]; kpis: any[]; risks: any[] },
    totalDays: number
): StartupPlan => {
    const planId = uuidv4(); // Generate Plan ID first to use in children
    const ranges = calculatePhaseRanges(totalDays);
    const phases: Phase[] = [];

    // Helper to distribute tasks into days with stable IDs
    const createPhase = (name: "Validation" | "Build" | "Launch" | "Scale", range: { start: number, end: number }, index: number) => {
        const phaseId = `${planId}-phase-${index}`;
        const phaseTasks = aiResponse.tasks.filter(t => t.phase === name);

        const days: DayPlan[] = [];
        const duration = range.end - range.start + 1;

        // Initialize days
        for (let i = 0; i < duration; i++) {
            const currentDayNumber = range.start + i;
            // Day 1 is active, others locked by default
            const initialStatus: DayStatus = currentDayNumber === 1 ? "active" : "locked";

            days.push({
                id: `${planId}-day-${currentDayNumber}`, // Stable Day ID
                dayNumber: currentDayNumber,
                objective: "Execute planned tasks",
                tasks: [],
                status: initialStatus,
                isCompleted: false
            });
        }

        // Distribute tasks
        phaseTasks.forEach((task, tIndex) => {
            const dayIndex = tIndex % duration;
            const day = days[dayIndex];

            const taskId = `${planId}-day-${range.start + dayIndex}-task-${day.tasks.length}`;

            let dependsOn: string[] = [];
            let status: "locked" | "available" | "completed" = "available";

            // Linear dependency: Depends on previous task in the same day
            if (day.tasks.length > 0) {
                const prevTask = day.tasks[day.tasks.length - 1];
                dependsOn = [prevTask.id];
                status = "locked";
            }

            // Generate deterministic steps if not provided by AI
            const steps: ExecutionStep[] = task.steps || [
                { id: `${taskId}-step-1`, title: "Analyze requirements", completed: false },
                { id: `${taskId}-step-2`, title: "Draft initial version", completed: false },
                { id: `${taskId}-step-3`, title: "Review and refine", completed: false },
                { id: `${taskId}-step-4`, title: "Finalize output", completed: false }
            ];

            const newTask: Task = {
                ...task,
                id: taskId,
                dependsOn: dependsOn,
                status: status,
                objective: task.objective || `Successfully complete ${task.title}`,
                deliverable: task.deliverable || "Documented outcome",
                kpiImpact: task.kpiImpact || "Progress toward phase goal",
                steps: steps
            };

            day.tasks.push(newTask);
        });

        // Ensure NO day is empty. If a day has 0 tasks, add a fallback "Strategic Review" task.
        days.forEach((day, dayIdx) => {
            if (day.tasks.length === 0) {
                const taskId = `${planId}-day-${day.dayNumber}-task-0`;
                const fallbackTask: Task = {
                    id: taskId,
                    title: "Strategic Progress Review",
                    description: "Assess the progress made so far and prepare documentation for the next phase of execution.",
                    category: "Management",
                    priority: "Medium",
                    status: "available",
                    estimated_days: 1,
                    phase: name,
                    objective: `Review and consolidate findings for Day ${day.dayNumber}`,
                    deliverable: "Strategic review doc",
                    kpiImpact: "Alignment and execution clarity",
                    steps: [
                        { id: `${taskId}-step-1`, title: "Review previous milestones", completed: false },
                        { id: `${taskId}-step-2`, title: "Identify bottlenecks or risks", completed: false },
                        { id: `${taskId}-step-3`, title: "Refine tactical plan for tomorrow", completed: false }
                    ]
                };
                day.tasks.push(fallbackTask);
            }
        });

        // Assign objectives
        days.forEach(day => {
            if (day.tasks.length > 0) {
                day.objective = `Complete: ${day.tasks[0].title.substring(0, 30)}...`;
            } else {
                day.objective = "Review progress and prepare for next steps";
            }
        });

        return {
            id: phaseId,
            name: name,
            startDay: range.start,
            endDay: range.end,
            days: days
        };
    };

    // Validation Phase
    phases.push(createPhase("Validation", ranges.Validation, 0));

    // Build Phase
    phases.push(createPhase("Build", ranges.Build, 1));

    // Launch Phase
    phases.push(createPhase("Launch", ranges.Launch, 2));

    // Scale Phase (if applicable)
    if (ranges.Scale) {
        phases.push(createPhase("Scale", ranges.Scale, 3));
    }

    // Generate Default Startup OS Data
    const sprints: Sprint[] = [
        { id: "sprint-1", weekNumber: 1, goal: "Problem Validation", completed: false },
        { id: "sprint-2", weekNumber: 2, goal: "MVP Development", completed: false },
        { id: "sprint-3", weekNumber: 3, goal: "Early Users", completed: false },
        { id: "sprint-4", weekNumber: 4, goal: "Feedback & Iteration", completed: false }
    ];

    const okrs: OKR[] = [
        {
            id: "okr-1",
            objective: "Validate problem-solution fit",
            keyResults: [
                { id: "kr-1", title: "Interview 10 potential users", targetValue: 10, currentValue: 0 },
                { id: "kr-2", title: "Achieve 70% validation score", targetValue: 70, currentValue: 0 }
            ]
        }
    ];

    // Default KPIs if AI doesn't provide them nicely
    const kpis: KPI[] = (aiResponse.kpis || []).map((k: any, i: number) => ({
        id: `kpi-${i}`,
        name: k.name || k,
        value: 0,
        target: 100
    }));
    if (kpis.length === 0) {
        kpis.push({ id: "kpi-1", name: "User Interviews", value: 0, target: 10 });
        kpis.push({ id: "kpi-2", name: "Waitlist Signups", value: 0, target: 100 });
    }

    const risks: RiskItem[] = (aiResponse.risks || []).map((r: any, i: number) => ({
        id: `risk-${i}`,
        description: r.description || r,
        impact: "medium",
        mitigation: "Monitor closely",
        resolved: false
    }));
    if (risks.length === 0) {
        risks.push({
            id: "risk-1",
            description: "Users may not see strong value proposition",
            impact: "high",
            mitigation: "Conduct thorough problem interviews before building",
            resolved: false
        });
    }

    const assumptions: Assumption[] = [
        {
            id: "assumption-1",
            statement: "Target users experience this problem frequently",
            validated: false,
            notes: ""
        }
    ];

    return {
        id: planId,
        title: aiResponse.title,
        summary: aiResponse.summary,
        phases: phases,
        totalDays: totalDays,
        currentDay: 1,
        overallProgress: 0,
        startDate: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        lastActiveDate: null,
        streak: 1,
        okrs,
        kpis,
        risks,
        assumptions,
        sprints
    };
};
