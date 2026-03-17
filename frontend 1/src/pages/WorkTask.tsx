import { useParams, useNavigate } from "react-router-dom";
import { usePlan } from "@/context/PlanContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    ArrowLeft,
    CheckCircle2,
    Sparkles,
    BookOpen,
    MessageSquare,
    Lock,
    Info,
    List,
    HelpCircle,
    Zap,
    ExternalLink,
    Loader2,
    Save
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { useStartup } from "@/hooks/useStartup";

interface GuideLink {
    title: string;
    url: string;
}

interface TaskGuide {
    brief_explanation: string;
    description: string;
    workflow: string[];
    why_this_process: string;
    how_to_do_this: string;
    guidance_links: GuideLink[];
    suitable_links: GuideLink[];
}

const WorkTask = () => {
    const { dayNumber, taskId } = useParams();
    const navigate = useNavigate();
    const { plan, updateTaskStatus, toggleStepCompletion, saveTaskNotes, saveTaskGuide } = usePlan();
    const { activeStartup } = useStartup();
    const { toast } = useToast();
    const [notes, setNotes] = useState("");
    const [guide, setGuide] = useState<TaskGuide | null>(null);
    const [loadingGuide, setLoadingGuide] = useState(true);
    const fetchingRef = useRef<string | null>(null);

    const isFounderOrCoFounder = activeStartup?.userRole === "founder" || activeStartup?.userRole === "co_founder";

    // Persistence: Read from Supabase Progress Object
    useEffect(() => {
        if (!taskId || !activeStartup?.progress) return;
        const savedNotes = activeStartup.progress[taskId]?.notes;
        if (savedNotes) {
            setNotes(savedNotes);
        }
    }, [taskId, activeStartup?.progress]);

    const handleSaveNotes = () => {
        if (!taskId) return;
        saveTaskNotes(taskId, notes);
        toast({
            title: "Progress Saved",
            description: "Your execution notes have been saved to your workspace.",
        });
    };

    // Hard Validation Logic
    useEffect(() => {
        if (!plan || !dayNumber || !taskId) return;

        const day = plan.phases
            .flatMap(phase => phase.days)
            .find(d => d.dayNumber === Number(dayNumber));

        if (!day) {
            navigate("/plans", { replace: true });
            return;
        }

        const taskFound = day.tasks.find(t => t.id === taskId);
        if (!taskFound) {
            navigate("/plans", { replace: true });
            return;
        }

    }, [plan, dayNumber, taskId, navigate]);

    // Fetch AI Guide with Caching
    useEffect(() => {
        const fetchGuide = async () => {
            if (!plan || !dayNumber || !taskId) return;

            // 1. Check Cache First
            if (activeStartup?.progress?.[taskId]?.guide_data) {
                setGuide(activeStartup.progress[taskId].guide_data);
                setLoadingGuide(false);
                return;
            }

            if (fetchingRef.current === taskId) return;

            const day = plan.phases
                .flatMap(phase => phase.days)
                .find(d => d.dayNumber === Number(dayNumber));
            const task = day?.tasks.find(t => t.id === taskId);
            const phase = plan.phases.find(p => p.days.some(d => d.dayNumber === Number(dayNumber)))?.name;

            if (!task || !phase) return;

            fetchingRef.current = taskId;
            setLoadingGuide(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-guide`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        task_title: task.title,
                        task_description: task.description,
                        phase: phase,
                        day: Number(dayNumber)
                    }),
                });

                if (!response.ok) throw new Error("Failed to fetch guide");
                const data = await response.json();

                // 2. Cache result
                await saveTaskGuide(taskId, data);
                setGuide(data);
            } catch (error) {
                console.error("Error fetching AI guide:", error);
            } finally {
                setLoadingGuide(false);
            }
        };

        fetchGuide();
    }, [plan, dayNumber, taskId]);

    if (!plan) return <div className="p-8 flex justify-center mt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const currentPhase = plan.phases.find(p => p.days.some(d => d.dayNumber === Number(dayNumber)));
    const currentDay = currentPhase?.days.find(d => d.dayNumber === Number(dayNumber));
    const task = currentDay?.tasks.find(t => t.id === taskId);

    if (!task || !currentPhase) return null;

    if (currentDay?.status === "locked" || task.status === "locked") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="max-w-md text-center space-y-4">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold">{currentDay?.status === "locked" ? `Day ${dayNumber} Locked` : "Task Locked"}</h1>
                    <p className="text-muted-foreground">
                        {currentDay?.status === "locked"
                            ? `You must complete all tasks in the previous day to unlock Day ${dayNumber}.`
                            : `You must complete the previous tasks in the plan before unlocking ${task.title}.`
                        }
                    </p>
                    <Button onClick={() => navigate("/plans")} className="gap-2 mt-4">
                        <ArrowLeft className="h-4 w-4" /> Back to Plan
                    </Button>
                </div>
            </div>
        );
    }

    const handleComplete = () => {
        if (!isFounderOrCoFounder) {
             toast({
                 title: "Access Denied",
                 description: "Only Founders and Co-founders can mark tasks as complete.",
                 variant: "destructive",
             });
             return;
        }
        updateTaskStatus(task.id, "completed");
        navigate("/plans");
    };

    return (
        <div className="min-h-screen bg-background/30">
            {/* Header */}
            <div className="border-b bg-card/80 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/plans")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-xl font-display">Day {dayNumber}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{currentPhase.name}</Badge>
                            <span className="font-medium text-foreground/70">{task.title}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleComplete} variant={task.status === "completed" ? "outline" : "hero"} disabled={!isFounderOrCoFounder}>
                        {task.status === "completed" ? "Completed" : "Mark Complete"}
                    </Button>
                </div>
            </div>

            <div className="container mx-auto max-w-7xl p-6 lg:p-12 space-y-12">

                {loadingGuide ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="text-center space-y-2">
                            <p className="text-xl font-display font-bold text-foreground">Analyzing Strategy</p>
                            <p className="text-muted-foreground font-medium animate-pulse">Your professional execution guide is being prepared...</p>
                        </div>
                    </div>
                ) : guide ? (
                    <div className="space-y-16">
                        <div className="grid lg:grid-cols-12 gap-12 items-start">
                            {/* Main Content Area (8/12) */}
                            <div className="lg:col-span-8 space-y-16">

                                {/* Brief & Significance */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3 text-primary">
                                        <div className="p-2.5 bg-primary/10 rounded-xl">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-display font-bold">Brief Explanation</h2>
                                    </div>
                                    <Card className="border-primary/10 shadow-card overflow-hidden bg-card/50 backdrop-blur-sm border-2">
                                        <CardContent className="p-10 space-y-8">
                                            <p className="text-2xl font-medium leading-relaxed text-foreground tracking-tight">
                                                {guide.brief_explanation}
                                            </p>
                                            <div className="pt-8 border-t border-border/50">
                                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                                    <Info className="h-4 w-4" />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Strategic Significance</span>
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed text-lg">
                                                    {guide.description}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </section>

                                {/* Why This Process */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3 text-orange-600">
                                        <div className="p-2.5 bg-orange-50 rounded-xl">
                                            <HelpCircle className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-display font-bold">Strategic Rationale</h2>
                                    </div>
                                    <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-orange-50/80 to-orange-100/40 border border-orange-100 text-orange-950/80 leading-relaxed italic shadow-sm text-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-5">
                                            <HelpCircle className="h-32 w-32" />
                                        </div>
                                        <span className="relative z-10 leading-loose">"{guide.why_this_process}"</span>
                                    </div>
                                </section>

                                {/* Workflow */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3 text-blue-600">
                                        <div className="p-2.5 bg-blue-50 rounded-xl">
                                            <List className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-display font-bold">Process Workflow</h2>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {guide.workflow.map((step, idx) => (
                                            <Card key={idx} className="border-blue-100/50 shadow-none hover:shadow-card hover:-translate-y-1 transition-all duration-300 bg-card hover:border-blue-200 group">
                                                <CardContent className="p-8 flex gap-5 items-start">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-base font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-lg font-medium text-foreground/80 pt-1.5">{step}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </section>

                                {/* Tactical Execution */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3 text-green-600">
                                        <div className="p-2.5 bg-green-50 rounded-xl">
                                            <Zap className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-display font-bold">Tactical Execution</h2>
                                    </div>
                                    <Card className="border-green-100 bg-white/50 shadow-sm border-2 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Zap className="h-24 w-24" />
                                        </div>
                                        <CardContent className="p-10 space-y-6">
                                            {guide.how_to_do_this.split(/\d+\./).filter(s => s.trim()).length > 1 ? (
                                                <div className="space-y-6">
                                                    {guide.how_to_do_this.split(/(?=\d+\.)/).filter(s => s.trim()).map((step, idx) => (
                                                        <div key={idx} className="flex gap-4 group/item">
                                                            <div className="mt-1.5 flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold group-hover/item:bg-green-600 group-hover/item:text-white transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <p className="text-foreground/80 leading-relaxed text-lg pt-0.5">
                                                                {step.replace(/^\d+\.\s*/, "").trim()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-lg">
                                                    {guide.how_to_do_this}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </section>
                            </div>

                            {/* Sidebar Area (4/12) */}
                            <div className="lg:col-span-4 space-y-12 sticky top-28">

                                {/* Resources Section */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 text-purple-600 px-1">
                                        <ExternalLink className="h-5 w-5" />
                                        <h2 className="text-xl font-bold">Resources & Tools</h2>
                                    </div>
                                    <div className="space-y-6">
                                        <Card className="border-purple-100 shadow-sm overflow-hidden bg-card/80 border-2">
                                            <div className="bg-purple-50 px-5 py-3 border-b border-purple-100">
                                                <h3 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Guidance Documentation</h3>
                                            </div>
                                            <CardContent className="p-3">
                                                <div className="space-y-1.5">
                                                    {guide.guidance_links.map((link, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-between p-4 rounded-xl hover:bg-purple-50 text-base font-medium group transition-all"
                                                        >
                                                            <span className="truncate pr-3">{link.title}</span>
                                                            <ExternalLink className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-indigo-100 shadow-sm overflow-hidden bg-card/80 border-2">
                                            <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
                                                <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Execution Software</h3>
                                            </div>
                                            <CardContent className="p-3">
                                                <div className="space-y-1.5">
                                                    {guide.suitable_links.map((link, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-between p-4 rounded-xl hover:bg-indigo-50 text-base font-medium group transition-all"
                                                        >
                                                            <span className="truncate pr-3">{link.title}</span>
                                                            <ExternalLink className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </section>

                                {/* Native Steps Progress */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 text-muted-foreground px-1">
                                        <BookOpen className="h-5 w-5" />
                                        <h2 className="text-xl font-bold">Progress Checklist</h2>
                                    </div>
                                    <Card className="p-3 bg-card/50 border-2">
                                        <div className="space-y-2">
                                            {task.steps?.map((step) => (
                                                <div
                                                    key={step.id}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border border-transparent transition-all ${isFounderOrCoFounder ? 'cursor-pointer hover:bg-accent/50 hover:border-border' : 'cursor-default'} ${step.completed ? "bg-primary/5 border-primary/10" : ""
                                                        }`}
                                                    onClick={() => {
                                                        if (isFounderOrCoFounder) {
                                                            toggleStepCompletion(task.id, step.id);
                                                        } else {
                                                            toast({ title: "Access Denied", description: "Only Founders and Co-founders can update checklists.", variant: "destructive" });
                                                        }
                                                    }}
                                                >
                                                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${step.completed ? "bg-primary border-primary text-primary-foreground scale-110" : "border-muted-foreground/30"
                                                        }`}>
                                                        {step.completed && <CheckCircle2 className="h-4 w-4" />}
                                                    </div>
                                                    <span className={`text-base font-semibold ${step.completed ? "line-through text-muted-foreground/60" : "text-foreground/90"}`}>
                                                        {step.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </section>
                            </div>
                        </div>

                        {/* Persistent Execution Workspace at bottom */}
                        <section className="space-y-8 pt-16 border-t-2 border-primary/5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <div className="p-3 bg-muted rounded-2xl text-foreground border shadow-sm">
                                        <MessageSquare className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-display font-bold text-foreground">Execution Workspace</h2>
                                        <p className="text-sm text-muted-foreground">Detailed findings and output drafts are stored locally.</p>
                                    </div>
                                </div>
                                <Button size="lg" onClick={handleSaveNotes} className="gap-2 rounded-[1.25rem] px-8 shadow-hero hover:shadow-hero-hover transition-all">
                                    <Save className="h-5 w-5" /> Save Output Progress
                                </Button>
                            </div>
                            <Card className="overflow-hidden shadow-card border-none ring-1 ring-border/50">
                                <CardContent className="p-0">
                                    <Textarea
                                        placeholder="Record your findings, research data, or draft content here. This space persists locally to your browser and is your dedicated workbench for this specific task..."
                                        className="min-h-[400px] text-xl border-none shadow-none focus-visible:ring-0 p-12 leading-relaxed resize-none bg-card/20 backdrop-blur-sm"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                    <div className="px-12 py-5 bg-muted/20 border-t flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground font-bold tracking-wider uppercase flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Cloud Persistence Active
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">{notes.length} characters documented</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <p className="text-muted-foreground">Unable to generate guide. Please try again.</p>
                        <Button variant="outline" onClick={() => window.location.reload()}>Retry Generation</Button>
                    </div>
                )}
            </div>
            <ChatWidget />
        </div >
    );
};

export default WorkTask;
