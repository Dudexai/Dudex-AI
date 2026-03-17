import { useParams, useNavigate } from "react-router-dom";
import { usePlan, Task } from "../context/PlanContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Clock, BookOpen, Code, FileText, Share2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";

const TaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { plan } = usePlan();

    if (!plan) {
        return <div className="p-8">Loading...</div>;
    }

    // FIND TASK IN NEW STRUCTURE
    let task: Task | undefined;
    let currentPhase: any;

    for (const phase of plan.phases) {
        for (const day of phase.days) {
            const found = day.tasks.find(t => t.id === taskId);
            if (found) {
                task = found;
                currentPhase = phase;
                break;
            }
        }
        if (task) break;
    }

    if (!task) {
        return (
            <div className="p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold">Task not found</h2>
                <Button onClick={() => navigate("/plans")}>Back to Plan</Button>
            </div>
        );
    }

    // COLLECT SIBLING TASKS FOR SIDEBAR
    // Flatten tasks from the current phase to show in sidebar
    const siblingTasks = currentPhase?.days.flatMap((d: any) => d.tasks) || [];

    return (
        <div className="min-h-screen gradient-hero pb-20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/plans")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Plan
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Share2 className="h-4 w-4" />
                            Share
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar / Navigation (Desktop) */}
                    <div className="hidden lg:block space-y-6">
                        <div className="font-semibold text-lg px-2">Current Phase</div>
                        <div className="space-y-1">
                            {siblingTasks.map((t: Task) => (
                                <div
                                    key={t.id}
                                    onClick={() => navigate(`/plans/${t.id}`)}
                                    className={`p-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${t.id === task!.id
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-accent text-muted-foreground"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${t.id === task!.id ? "bg-primary" : "bg-border"}`} />
                                        <span className="line-clamp-1">{t.title}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Task Header */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant="outline" className="capitalize">{task.phase}</Badge>
                                <Badge variant={task.priority === "High" ? "destructive" : "secondary"}>{task.priority} Priority</Badge>
                                <span className="flex items-center text-sm text-muted-foreground gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.estimated_days} days
                                </span>
                            </div>
                            <h1 className="text-3xl font-display font-bold text-foreground mb-4">{task.title}</h1>
                            <p className="text-lg text-muted-foreground">{task.description}</p>
                        </div>

                        {/* Content Tabs */}
                        <Tabs defaultValue="cheatsheet" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                                <TabsTrigger
                                    value="cheatsheet"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
                                >
                                    Cheat Sheet
                                </TabsTrigger>
                                <TabsTrigger
                                    value="discussion"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
                                >
                                    Discussion
                                </TabsTrigger>
                                <TabsTrigger
                                    value="notes"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
                                >
                                    Notes
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-6">
                                <TabsContent value="cheatsheet" className="space-y-6 animate-fade-in">
                                    <Card>
                                        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                                            <h3>Overview</h3>
                                            <p>
                                                This task is a critical component of the <strong>{task.phase}</strong> phase.
                                                Below is a structured guide to help you execute "{task.title}".
                                            </p>

                                            <div className="my-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                                <h4 className="flex items-center gap-2 text-primary m-0 mb-2">
                                                    <BookOpen className="h-5 w-5" />
                                                    Key Objectives
                                                </h4>
                                                <ul className="m-0 pl-4">
                                                    <li>Understand the core requirements for {task.title}.</li>
                                                    <li>Research best practices and existing solutions.</li>
                                                    <li>Draft an initial implementation plan or document.</li>
                                                </ul>
                                            </div>

                                            <h3>Implementation Steps</h3>
                                            <ol>
                                                <li>
                                                    <strong>Research & Analysis</strong>: Spend the first {Math.ceil(task.estimated_days * 0.2)} days understanding the problem space.
                                                </li>
                                                <li>
                                                    <strong>Prototyping</strong>: Create a quick proof of concept or draft.
                                                </li>
                                                <li>
                                                    <strong>Execution</strong>: distinct implementation.
                                                </li>
                                                <li>
                                                    <strong>Review</strong>: Validate against requirements.
                                                </li>
                                            </ol>

                                            <h3>Resources</h3>
                                            <ul>
                                                <li><a href="#" className="font-medium text-primary hover:underline">Internal Documentation</a></li>
                                                <li><a href="#" className="font-medium text-primary hover:underline">Best Practices Guide</a></li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="discussion">
                                    <Card>
                                        <CardContent className="p-8 text-center text-muted-foreground">
                                            No discussions yet. Start a thread to collaborate with your team.
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="notes">
                                    <Card>
                                        <CardContent className="p-8 text-center text-muted-foreground">
                                            Keep personal notes here for quick reference properly.
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
