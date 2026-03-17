import { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from "react";
import { StartupPlan, Task, TaskProgress } from "@/lib/planUtils";
import { computePlanMetrics } from "@/lib/metricsEngine";
import { deriveStrategyFromMetrics } from "@/lib/strategyEngine";
import { useStartup } from "@/hooks/useStartup";
import { supabase } from "@/integrations/supabase/client";

interface PlanContextType {
    plan: StartupPlan | null;
    setPlan: (plan: StartupPlan) => void;
    updateTaskStatus: (taskId: string, status: "locked" | "available" | "completed") => void;
    toggleStepCompletion: (taskId: string, stepId: string) => void;
    markDayComplete: (dayNumber: number) => void;
    resetPlan: () => void;
    checkStreak: () => void;
    saveTaskNotes: (taskId: string, notes: string) => void;
    saveTaskGuide: (taskId: string, guide_data: any) => void;

    updateKPI: (kpiId: string, value: number) => void;
    updateKeyResult: (okrId: string, krId: string, value: number) => void;
    toggleRiskResolved: (riskId: string) => void;
    toggleAssumptionValidated: (assumptionId: string) => void;
    updateSprintCompletion: (sprintId: string, completed: boolean) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider = ({ children }: { children: ReactNode }) => {
    const { activeStartup } = useStartup();

    const [planRaw, setPlanRawState] = useState<StartupPlan | null>(null);
    const [taskProgress, setTaskProgressState] = useState<TaskProgress>({});
    const progressRef = useRef<TaskProgress>({});

    useEffect(() => {
        if (activeStartup) {
            setPlanRawState(activeStartup.plan_data || null);
            setTaskProgressState(activeStartup.progress || {});
            progressRef.current = activeStartup.progress || {};
            
            // Check if streak was lost on load
            if (activeStartup.plan_data) {
                console.log("PlanContext updating with new activeStartup:", activeStartup.id, activeStartup.name);
                setTimeout(() => {
                    // We need to call via ref or avoid direct dependency cycle
                    // The easiest hook approach is to let checkStreak process if we define its bare logic,
                    // but we will rely on the initial load trick.
                    const plan = activeStartup.plan_data as StartupPlan;
                    const today = new Date().toISOString().split('T')[0];
                    const lastActive = plan.lastActiveDate?.split('T')[0];
                    if (lastActive) {
                       const yesterday = new Date();
                       yesterday.setDate(yesterday.getDate() - 1);
                       const yesterdayStr = yesterday.toISOString().split('T')[0];
                       if (lastActive < yesterdayStr && lastActive !== today && plan.streak > 0) {
                           // Lost streak, auto reset
                           supabase.from("startups").update({ 
                               plan_data: { ...plan, streak: 0 } as any 
                           }).eq("id", activeStartup.id).then(() => {
                               setPlanRawState({ ...plan, streak: 0 });
                           });
                       }
                    }
                }, 100);
            }
        } else {
            setPlanRawState(null);
            setTaskProgressState({});
        }
    }, [activeStartup?.id, activeStartup?.plan_data, activeStartup?.progress]);

    const recalculateExecutionState = (currentPlan: StartupPlan, progress: TaskProgress): StartupPlan => {
        let previousDayCompleted = true;

        const newPhases = (currentPlan.phases || []).map(phase => ({
            ...phase,
            days: (phase.days || []).map(day => {
                let dayStatus: "locked" | "active" | "completed" = "locked";

                if (day.dayNumber === 1) dayStatus = "active";
                else if (previousDayCompleted) dayStatus = "active";

                const recalculatedTasks = (day.tasks || []).map(task => {
                    let taskStatus: "locked" | "available" | "completed" = "locked";
                    const action = progress[task.id];
                    const isActionCompleted = action?.completed === true;

                    if (dayStatus === "locked") {
                        taskStatus = "locked";
                    } else {
                        let dependenciesMet = true;
                        if (task.dependsOn && task.dependsOn.length > 0) {
                            dependenciesMet = task.dependsOn.every(depId => progress[depId]?.completed === true);
                        }

                        if (dependenciesMet) {
                            taskStatus = isActionCompleted ? "completed" : "available";
                        } else {
                            taskStatus = "locked";
                        }
                    }

                    let newSteps = task.steps;
                    if (action && action.steps && task.steps) {
                        newSteps = task.steps.map(s => ({
                            ...s,
                            completed: action.steps?.[s.id] || false
                        }));
                    }

                    return { ...task, status: taskStatus, steps: newSteps };
                });

                const allTasksCompleted = recalculatedTasks.length === 0 || recalculatedTasks.every(t => t.status === "completed");
                if (allTasksCompleted && dayStatus !== "locked") {
                    dayStatus = "completed";
                }

                previousDayCompleted = dayStatus === "completed";

                return {
                    ...day,
                    status: dayStatus,
                    tasks: recalculatedTasks,
                    isCompleted: dayStatus === "completed"
                };
            })
        }));

        return { ...currentPlan, phases: newPhases };
    };

    const planComputed = useMemo(() => {
        if (!planRaw) return null;

        const executionPlan = recalculateExecutionState(planRaw, taskProgress);
        const metrics = computePlanMetrics(executionPlan, taskProgress);
        const strategyUpdates = deriveStrategyFromMetrics(executionPlan, metrics);

        return { ...executionPlan, ...strategyUpdates };
    }, [planRaw, taskProgress]);

    const saveTaskProgress = async (progress: TaskProgress) => {
        setTaskProgressState(progress);
        progressRef.current = progress;
        if (activeStartup) {
            const { error } = await supabase
                .from("startups")
                .update({ progress })
                .eq("id", activeStartup.id);
            if (error) console.error("Error saving progress to Supabase:", error);
        }
    };

    const setPlan = async (newPlan: StartupPlan) => {
        setPlanRawState(newPlan);
        if (activeStartup) {
            const { error } = await supabase
                .from("startups")
                .update({ plan_data: newPlan as any })
                .eq("id", activeStartup.id);
            if (error) console.error("Error saving plan to Supabase:", error);
        }
    };

    const updateTaskStatus = async (taskId: string, status: "locked" | "available" | "completed") => {
        if (!planRaw) return;

        const newProgress = { ...progressRef.current };
        newProgress[taskId] = {
            ...(newProgress[taskId] || {}),
            completed: status === "completed",
            updatedAt: Date.now()
        };
        
        await saveTaskProgress(newProgress);

        if (status === "completed") {
            try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL}/strategy/${planRaw.id}/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event_type: "task_completed", payload: { task_id: taskId } })
                });
            } catch (e) {
                console.error("Failed to sync task", e);
            }

            // Check and update streak when a task is completed
            await checkStreak(true);
        }
    };

    const toggleStepCompletion = async (taskId: string, stepId: string) => {
        if (!planRaw) return;

        const newProgress = { ...progressRef.current };
        const currentTaskProgress = newProgress[taskId] || { completed: false, updatedAt: Date.now(), steps: {} };
        const currentSteps = { ...(currentTaskProgress.steps || {}) };

        currentSteps[stepId] = !currentSteps[stepId];

        let taskDefinition: Task | undefined;
        for (const p of planRaw.phases) {
            for (const d of p.days) {
                const t = d.tasks.find(t => t.id === taskId);
                if (t) { taskDefinition = t; break; }
            }
            if (taskDefinition) break;
        }

        const isTaskCompleted = taskDefinition?.steps ? taskDefinition.steps.every(s => currentSteps[s.id]) : false;

        newProgress[taskId] = {
            ...currentTaskProgress,
            completed: isTaskCompleted,
            updatedAt: Date.now(),
            steps: currentSteps
        };

        await saveTaskProgress(newProgress);

        if (isTaskCompleted) {
            try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL}/strategy/${planRaw.id}/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event_type: "task_completed", payload: { task_id: taskId } })
                });
            } catch (e) {
                console.error("Failed to sync step completion", e);
            }
        }
    };

    const markDayComplete = async (dayNumber: number) => {
        if (!planRaw) return;

        const newProgress = { ...progressRef.current };
        for (const phase of planRaw.phases) {
            const day = phase.days.find(d => d.dayNumber === dayNumber);
            if (day) {
                day.tasks.forEach(t => {
                    newProgress[t.id] = { ...(newProgress[t.id] || {}), completed: true, updatedAt: Date.now() };
                });
            }
        }
        await saveTaskProgress(newProgress);

        if (planRaw.currentDay === dayNumber && dayNumber < planRaw.totalDays) {
            await setPlan({ ...planRaw, currentDay: dayNumber + 1 });
        }
    };

    const saveTaskNotes = async (taskId: string, notes: string) => {
        if (!planRaw) return;
        const newProgress = { ...progressRef.current };
        newProgress[taskId] = {
            ...(newProgress[taskId] || { completed: false, updatedAt: Date.now() }),
            notes
        };
        await saveTaskProgress(newProgress);
    };

    const saveTaskGuide = async (taskId: string, guide_data: any) => {
        if (!planRaw) return;
        const newProgress = { ...progressRef.current };
        newProgress[taskId] = {
            ...(newProgress[taskId] || { completed: false, updatedAt: Date.now() }),
            guide_data
        };
        await saveTaskProgress(newProgress);
    };

    const updateKPI = () => console.warn("Dashboard is now read-only. Metrics are derived from execution.");
    const updateKeyResult = () => console.warn("Dashboard is now read-only. OKRs are derived from execution.");
    const toggleRiskResolved = () => console.warn("Dashboard is now read-only. Risks are auto-evaluated.");
    const toggleAssumptionValidated = () => console.warn("Dashboard is now read-only. Assumptions are auto-validated.");
    const updateSprintCompletion = () => console.warn("Dashboard is now read-only. Sprints auto-complete.");

    const checkStreak = async (justCompletedTask = false) => {
        if (!planRaw || !activeStartup) return;

        const today = new Date().toISOString().split('T')[0];
        const lastActive = planRaw.lastActiveDate?.split('T')[0];

        let newStreak = planRaw.streak || 0;
        let newLastActive = planRaw.lastActiveDate;
        let requiresUpdate = false;

        // Reset streak if we missed yesterday entirely
        if (lastActive) {
           const yesterday = new Date();
           yesterday.setDate(yesterday.getDate() - 1);
           const yesterdayStr = yesterday.toISOString().split('T')[0];
           
           if (lastActive < yesterdayStr && lastActive !== today) {
               newStreak = 0;
               requiresUpdate = true;
           }
        }

        // Increment streak if we just completed a task and haven't credited today
        if (justCompletedTask && lastActive !== today) {
            newStreak = (newStreak === 0 && !lastActive) ? 1 : newStreak + 1; // Start at 1 or increment
            newLastActive = new Date().toISOString();
            requiresUpdate = true;
        }

        if (requiresUpdate) {
            const updatedPlan = {
                ...planRaw,
                streak: newStreak,
                lastActiveDate: newLastActive
            };
            
            // Fast local update
            setPlanRawState(updatedPlan);

            // Persist to Supabase
            const { error } = await supabase
                .from("startups")
                .update({ plan_data: updatedPlan as any })
                .eq("id", activeStartup.id);

            if (error) {
                console.error("Error updating streak in Supabase:", error);
            } else if (justCompletedTask && newStreak > (planRaw.streak || 0)) {
               // Only notify if streak went UP
               console.log("Streak increased to", newStreak);
            }
        }
    };

    const resetPlan = async () => {
        if (!planRaw || !activeStartup) return;
        setTaskProgressState({});
        progressRef.current = {};
        
        const resetRaw = { ...planRaw, currentDay: 1 };
        setPlanRawState(resetRaw);

        const { error } = await supabase.from("startups").update({ 
            progress: {}, 
            plan_data: resetRaw as any
        }).eq("id", activeStartup.id);

        if (error) console.error("Error resetting plan", error);
    };

    const planRef = useRef<StartupPlan | null>(planRaw);
    useEffect(() => { planRef.current = planRaw; }, [planRaw]);

    useEffect(() => {
        let mounted = true;

        const fetchStrategyState = async () => {
            const currentPlan = planRef.current;
            if (!currentPlan) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/strategy/${currentPlan.id}/state`);
                if (res.ok && mounted) {
                    const data = await res.json();
                    let merged = { ...currentPlan };
                    let updated = false;

                    if (data.title && data.title !== currentPlan.title) {
                        merged.title = data.title;
                        updated = true;
                    }
                    if (data.summary && data.summary !== currentPlan.summary) {
                        merged.summary = data.summary;
                        updated = true;
                    }
                    if (updated) {
                         setPlanRawState(merged); // Do not use setPlan or it triggers DB write again
                    }
                }
            } catch (e) {
                console.error("Failed to fetch strategy state", e);
            }
        };

        if (planRaw?.id) {
            fetchStrategyState();
            return () => {
                mounted = false;
            };
        }
    }, [planRaw?.id]);

    return (
        <PlanContext.Provider value={{
            plan: planComputed,
            setPlan,
            updateTaskStatus,
            toggleStepCompletion,
            markDayComplete,
            resetPlan,
            checkStreak,
            saveTaskNotes,
            saveTaskGuide,
            updateKPI,
            updateKeyResult,
            toggleRiskResolved,
            toggleAssumptionValidated,
            updateSprintCompletion
        }}>
            {children}
        </PlanContext.Provider>
    );
};

export const usePlan = () => {
    const context = useContext(PlanContext);
    if (!context) throw new Error("usePlan must be used within a PlanProvider");
    return context;
};
export type { StartupPlan, Task, DayPlan, Phase } from "@/lib/planUtils";
