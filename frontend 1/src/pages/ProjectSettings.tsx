import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Copy, Trash2, Save, RotateCcw } from "lucide-react";
import { usePlan } from "@/context/PlanContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectSettings() {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { activeStartup, userRole, deleteStartup, refreshStartups } = useStartup();
    const { resetPlan } = usePlan();

    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projectId, setProjectId] = useState("");
    const [showRestartDialog, setShowRestartDialog] = useState(false);

    const isFounder = userRole?.toLowerCase() === "founder" || userRole?.toLowerCase() === "co_founder";
    const isStrictFounder = userRole?.toLowerCase() === "founder";

    useEffect(() => {
        if (activeStartup) {
            setProjectName(activeStartup.name);
            setProjectId(activeStartup.id);
        }
    }, [activeStartup]);

    const handleDeleteStartup = async () => {
        if (!activeStartup) return;

        if (confirm(`Are you sure you want to delete "${activeStartup.name}"? This cannot be undone.`)) {
            try {
                await deleteStartup(activeStartup.id);
                toast({ title: "Deleted", description: `"${activeStartup.name}" has been removed.` });
                navigate("/home");
            } catch (error) {
                toast({ title: "Error", description: "Failed to delete startup", variant: "destructive" });
            }
        }
    };

    const handleSave = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800)); // Mock save
        toast({ title: "Saved", description: "Project settings updated." });
        setLoading(false);
    };

    const handleRestartConfirm = () => {
        resetPlan();
        setShowRestartDialog(false);
        toast({
            title: "Project Restarted",
            description: "Your project has been reset to Day 1. All task progress has been cleared.",
        });
        navigate("/dashboard");
    };

    const copyProjectId = async () => {
        if (!projectId) return;
        await navigator.clipboard.writeText(projectId);
        toast({ title: "Copied!", description: "Project ID copied to clipboard" });
    };


    if (!activeStartup) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            <TopBar />
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
                <PageHeader title="Project Settings" subtitle="Configure general options, domains, transfers, and project lifecycle." />

                <div className="space-y-8">

                    {/* General Settings */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">General settings</h2>
                        <Card className="bg-card border-border/50">
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="md:col-span-1">
                                        <Label htmlFor="projectName" className="text-base font-medium">Project name</Label>
                                        <p className="text-sm text-muted-foreground">Displayed throughout the dashboard.</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            id="projectName"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-4">
                                    <div className="md:col-span-1">
                                        <Label htmlFor="projectId" className="text-base font-medium">Project ID</Label>
                                        <p className="text-sm text-muted-foreground">Reference used in APIs and URLs.</p>
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <Input
                                            id="projectId"
                                            value={projectId}
                                            readOnly
                                            className="bg-muted/50 font-mono pr-20"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-muted-foreground"
                                            onClick={copyProjectId}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t border-border/50 py-3 bg-muted/20">
                                <Button onClick={handleSave} disabled={loading} size="sm" className="gap-2">
                                    <Save className="h-4 w-4" /> Save changes
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Project Availability */}
                    {isStrictFounder && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Project availability</h2>
                        <p className="text-sm text-muted-foreground mb-2">Restart your project to start fresh from Day 1.</p>
                        <Card className="bg-card border-border/50">
                            <CardContent className="flex items-center justify-between py-6">
                                <div>
                                    <h3 className="font-medium">Restart project</h3>
                                    <p className="text-sm text-muted-foreground">All task progress will be cleared and the project will restart from Day 1.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                    onClick={() => setShowRestartDialog(true)}
                                >
                                    <RotateCcw className="h-4 w-4" /> Restart project
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    )}


                    {/* Danger Zone */}
                    {isFounder && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
                            <Card className="border-destructive/20 bg-destructive/5">
                                <CardContent className="flex flex-col sm:flex-row justify-between items-center gap-4 py-6">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-destructive flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" /> Delete Project
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Permanently delete "{activeStartup.name}". This action cannot be undone.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteStartup}
                                        className="gap-2 w-full sm:w-auto"
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete Project
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>
            </div>

            {/* Restart Confirmation Dialog */}
            <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-orange-500" />
                            Restart your startup?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset <strong>all task progress</strong> and start your project from <strong>Day 1</strong> again.
                            Even completed tasks will be cleared. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRestartConfirm}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Yes, restart from Day 1
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
