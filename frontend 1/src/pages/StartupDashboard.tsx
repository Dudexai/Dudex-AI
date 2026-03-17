import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlan } from '@/context/PlanContext';
import { ArrowLeft, Target, BarChart2, ShieldAlert, BrainCircuit, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export const StartupDashboard = () => {
    const { planId } = useParams();
    const navigate = useNavigate();
    const { plan } = usePlan();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState("");

    const handleExportReport = async () => {
        if (!plan) return;
        setIsExporting(true);

        try {
            setExportStatus("Generating analysis...");
            setTimeout(() => setExportStatus("Writing report..."), 3000);
            setTimeout(() => setExportStatus("Preparing PDF..."), 7000);

            const response = await fetch(`http://localhost:8000/export/investor-report/${plan.id}`, {
                method: 'POST',
            });

            const contentType = response.headers.get("content-type");

            if (!response.ok || (contentType && contentType.includes("application/json"))) {
                const errorData = await response.json();
                throw new Error(errorData.stage ? `Report failed at: ${errorData.stage}` : "Export failed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Investor_Report_${plan.title.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Report Exported",
                description: "Your investor report has been downloaded successfully.",
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Export Failed",
                description: error.message || "There was an error generating your report. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
            setExportStatus("");
        }
    };

    if (!plan) return <div>Loading...</div>;

    const calculateOKRProgress = (keyResults: any[]) => {
        if (!keyResults.length) return 0;
        const totalProgress = keyResults.reduce((acc, kr) => {
            return acc + Math.min(100, (kr.currentValue / kr.targetValue) * 100);
        }, 0);
        return Math.round(totalProgress / keyResults.length);
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/plans")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-display font-bold">Startup Operating System</h1>
                        <p className="text-muted-foreground">Strategic overview for {plan.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleExportReport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {exportStatus}
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Export Investor Report
                            </>
                        )}
                    </Button>
                    <Badge variant="outline" className="px-3 py-1">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                        OS Active
                    </Badge>
                </div>
            </div>

            {/* Sprints Overview */}
            <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" /> Sprint Roadmap
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                    {plan.sprints?.map((sprint) => (
                        <Card key={sprint.id} className={`border-l-4 ${sprint.completed ? 'border-l-green-500 bg-green-50/10' : 'border-l-primary'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Week {sprint.weekNumber}</span>
                                    {sprint.completed ? (
                                        <Badge variant="default" className="bg-green-500">Completed</Badge>
                                    ) : (
                                        <Badge variant="secondary">In Progress</Badge>
                                    )}
                                </div>
                                <CardTitle className="text-lg mt-2">{sprint.goal}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">{sprint.completed ? "All milestone tasks finished" : "Awaiting execution completion"}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* OKRs */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" /> Objectives & Key Results
                    </h2>
                    {plan.okrs?.map((okr) => {
                        const progress = calculateOKRProgress(okr.keyResults);
                        return (
                            <Card key={okr.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-center mb-2">
                                        <CardTitle className="text-lg">{okr.objective}</CardTitle>
                                        <Badge variant={progress >= 100 ? "default" : "secondary"}>{progress}%</Badge>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {okr.keyResults.map((kr) => (
                                        <div key={kr.id} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{kr.title}</span>
                                                <span className="text-muted-foreground">{kr.currentValue} / {kr.targetValue}</span>
                                            </div>
                                            <Progress value={(kr.currentValue / kr.targetValue) * 100} className="h-1.5" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
                </section>

                {/* KPIs */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" /> Key Performance Indicators
                    </h2>
                    <div className="grid gap-4">
                        {plan.kpis?.map((kpi) => (
                            <Card key={kpi.id}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{kpi.name}</p>
                                            <p className="text-3xl font-bold">{kpi.value}<span className="text-sm font-normal text-muted-foreground ml-2">/ {kpi.target}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={kpi.value >= kpi.target ? "default" : "outline"}>
                                                {Math.round((kpi.value / kpi.target) * 100)}%
                                            </Badge>
                                        </div>
                                    </div>
                                    <Progress value={(kpi.value / kpi.target) * 100} className="h-2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Risks */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-red-500" /> Risk Management
                    </h2>
                    <div className="space-y-3">
                        {plan.risks?.map((risk) => (
                            <div key={risk.id} className={`p-4 rounded-lg border flex items-start gap-4 ${risk.resolved ? 'bg-green-50/30 border-green-100 opacity-80' : 'bg-card border-red-100'}`}>
                                <div className="mt-1">
                                    {risk.resolved ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <div className="h-5 w-5 rounded-full border-2 border-red-200" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant={risk.impact === 'high' ? 'destructive' : 'outline'} className="uppercase text-[10px]">
                                            {risk.impact} Impact
                                        </Badge>
                                        <p className={`font-medium ${risk.resolved ? 'line-through text-muted-foreground' : ''}`}>
                                            {risk.description}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Mitigation: {risk.mitigation}</p>
                                    {risk.resolved && <p className="text-xs text-green-600 font-medium mt-2">Auto-resolved via execution validation</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Assumptions */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-blue-500" /> Assumption Tracker
                    </h2>
                    <div className="space-y-3">
                        {plan.assumptions?.map((assumption) => (
                            <div
                                key={assumption.id}
                                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${assumption.validated ? 'bg-green-50/50 border-green-200' : 'bg-card'}`}
                            >
                                <div className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${assumption.validated ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground'}`}>
                                    {assumption.validated && <CheckCircle2 className="h-3 w-3" />}
                                </div>
                                <div>
                                    <p className={`font-medium ${assumption.validated ? 'text-green-900' : ''}`}>
                                        {assumption.statement}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {assumption.validated ? "Validated via user feedback/testing" : "Awaiting validation evidence"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
