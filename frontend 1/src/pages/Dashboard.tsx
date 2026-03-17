import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamManagement } from "@/components/TeamManagement";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, CheckCircle2, Clock, AlertCircle, Target, Copy, Flame, ArrowRight, List, Trophy
} from "lucide-react";
import { useStartup } from "@/hooks/useStartup";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/context/PlanContext";
import { useState, useEffect } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeStartup, userRole, loading } = useStartup();
  const { plan } = usePlan();
  const [copiedCode, setCopiedCode] = useState(false);

  const [kpis, setKpis] = useState([
    { label: "Tasks Completed", value: "0", icon: CheckCircle2, color: "text-primary" },
    { label: "Days Tracked", value: "0", icon: Clock, color: "text-caramel-light" },
    { label: "Current Phase", value: "-", icon: Target, color: "text-muted-foreground" },
    { label: "Streak", value: "0", icon: Flame, color: "text-orange-500" },
  ]);

  const [taskDistribution, setTaskDistribution] = useState<any[]>([]);
  const [progressTrend, setProgressTrend] = useState<any[]>([]);

  const handleCopyCode = async () => {
    if (!(activeStartup as any)?.organization_code) return;
    await navigator.clipboard.writeText((activeStartup as any).organization_code);
    setCopiedCode(true);
    toast({ title: "Copied!", description: "Organization code copied" });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    if (!activeStartup || !plan) return;

    // Calculate stats from new Plan structure
    const allDays = (plan.phases || []).flatMap(p => p.days || []);
    const allTasks = allDays.flatMap(d => d.tasks || []);
    const completedTasks = allTasks.filter(t => t.status === "completed").length;
    const completedDays = allDays.filter(d => d.isCompleted).length;

    // Determine current phase
    const currentPhase = (plan.phases || []).find(p => (plan.currentDay || 0) >= p.startDay && (plan.currentDay || 0) <= p.endDay);

    setKpis([
      { label: "Tasks Completed", value: String(completedTasks), icon: CheckCircle2, color: "text-primary" },
      { label: "Days Tracked", value: String(completedDays), icon: Clock, color: "text-caramel-light" },
      { label: "Current Phase", value: currentPhase?.name || "Planning", icon: Target, color: "text-muted-foreground" },
      { label: "Day Streak", value: String(plan.streak), icon: Flame, color: "text-orange-500" },
    ]);

    setTaskDistribution([
      { name: "Completed Tasks", value: completedTasks, color: "hsl(142, 71%, 45%)" },
      { name: "Pending Tasks", value: allTasks.length - completedTasks, color: "hsl(var(--muted))" },
    ]);

  }, [activeStartup?.id, plan]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!activeStartup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/home")}>Go to Home</Button>
      </div>
    );
  }

  // Get Today's Focus
  const currentDayPlan = plan?.phases.flatMap(p => p.days).find(d => d.dayNumber === plan.currentDay);

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/home" />
      <div className="container mx-auto px-6 py-8">

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {activeStartup.name} team.</p>
          </div>

          <div className="flex items-center gap-2">
            {(activeStartup as any).organization_code && (
              <div className="flex items-center gap-2 bg-card border px-3 py-1.5 rounded-full text-xs text-muted-foreground">
                <span className="font-mono">{(activeStartup as any).organization_code}</span>
                <button onClick={handleCopyCode} className="hover:text-primary">
                  {copiedCode ? "✓" : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S FOCUS WIDGET */}
        {currentDayPlan && (
          <div className="mb-8 animate-fade-in-up">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-elevated relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Target className="h-32 w-32" />
              </div>
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="space-y-4 max-w-2xl relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold tracking-wider text-primary uppercase">Today's Focus • Day {plan?.currentDay}</span>
                      {currentDayPlan.isCompleted && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-display font-bold leading-tight">{currentDayPlan.objective}</h2>
                  </div>

                  <div className="flex flex-col gap-2">
                    {currentDayPlan.tasks.slice(0, 3).map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        {task.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4" />}
                        <span className={task.status === "completed" ? "line-through opacity-70" : ""}>{task.title}</span>
                      </div>
                    ))}
                    {currentDayPlan.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-6">+{currentDayPlan.tasks.length - 3} more tasks</p>
                    )}
                  </div>
                </div>

                <Button
                  size="xl"
                  variant="hero"
                  className="shrink-0 shadow-lg relative z-10"
                  onClick={() => navigate("/plans")}
                >
                  Continue Execution <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(kpi => (
            <Card key={kpi.label} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold font-display">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Task Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={taskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {taskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {plan?.phases.flatMap(p => p.days)
                  .flatMap(d => d.tasks)
                  .filter(t => t.status === "completed")
                  .sort((a, b) => {
                    const aTime = (a as any).updatedAt || 0;
                    const bTime = (b as any).updatedAt || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 5)
                  .map(task => (
                    <div key={task.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="mt-1 flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed {new Date((task as any).updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                {(!plan || plan.phases.flatMap(p => p.days).flatMap(d => d.tasks).filter(t => t.status === "completed").length === 0) && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
