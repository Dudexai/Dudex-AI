import { useParams, useNavigate } from "react-router-dom";
import { usePlan } from "@/context/PlanContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CheckCircle2, Loader2, Save, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStartup } from "@/hooks/useStartup";

interface GuideLink { title: string; url: string }
interface WorkflowStep { step?: number; title?: string; details?: string; tools?: string[]; example?: string }
interface TaskGuide {
  brief_explanation?: string;
  description?: string;
  workflow?: Array<WorkflowStep | string>;
  why_this_process?: string;
  how_to_do_this?: unknown;
  guidance_links?: GuideLink[];
  suitable_links?: GuideLink[];
}

const asStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(item => typeof item === "string" ? [item] : item == null ? [] : [String(item)]);
  if (typeof value === "string") return value.split(/\r?\n/).map(line => line.replace(/^\s*(?:[-•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  return value == null ? [] : [String(value)];
};

const normalizeGuide = (value: any): TaskGuide => ({
  ...value,
  workflow: Array.isArray(value?.workflow) ? value.workflow : [],
  how_to_do_this: asStringList(value?.how_to_do_this),
  guidance_links: Array.isArray(value?.guidance_links) ? value.guidance_links : [],
  suitable_links: Array.isArray(value?.suitable_links) ? value.suitable_links : [],
});

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

  const task = plan?.phases.flatMap(phase => phase.days).find(day => day.dayNumber === Number(dayNumber))?.tasks.find(item => item.id === taskId);
  const currentPhase = plan?.phases.find(phase => phase.days.some(day => day.dayNumber === Number(dayNumber)));
  const currentDay = currentPhase?.days.find(day => day.dayNumber === Number(dayNumber));
  const canEdit = activeStartup?.userRole === "founder" || activeStartup?.userRole === "co_founder";

  useEffect(() => {
    const saved = taskId && activeStartup?.progress?.[taskId]?.notes;
    if (typeof saved === "string") setNotes(saved);
  }, [taskId, activeStartup?.progress]);

  useEffect(() => {
    if (!plan || !taskId || !dayNumber) return;
    const cached = activeStartup?.progress?.[taskId]?.guide_data;
    if (cached) {
      setGuide(normalizeGuide(cached));
      setLoadingGuide(false);
      return;
    }
    if (fetchingRef.current === taskId || !task || !currentPhase) return;
    fetchingRef.current = taskId;
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-guide`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_title: task.title, task_description: task.description, phase: currentPhase.name, day: Number(dayNumber) }),
        });
        if (!response.ok) throw new Error(`Guide request failed (${response.status})`);
        const normalized = normalizeGuide(await response.json());
        setGuide(normalized);
        await saveTaskGuide(taskId, normalized);
      } catch (error) {
        console.error("Error fetching AI guide:", error);
      } finally { setLoadingGuide(false); }
    })();
  }, [plan?.id, taskId, dayNumber, activeStartup?.id]);

  if (!plan || !task || !currentPhase || !currentDay) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (currentDay.status === "locked" || task.status === "locked") return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Lock /><h1>Task Locked</h1><Button onClick={() => navigate("/plans")}><ArrowLeft className="mr-2" /> Back to Plan</Button></div>;

  const steps = asStringList(guide?.how_to_do_this);
  const saveNotes = () => { saveTaskNotes(task.id, notes); toast({ title: "Progress Saved", description: "Your execution notes have been saved." }); };
  const complete = () => {
    if (!canEdit) { toast({ title: "Access Denied", description: "Only founders and co-founders can complete tasks.", variant: "destructive" }); return; }
    updateTaskStatus(task.id, "completed");
    navigate("/plans");
  };

  return <div className="min-h-screen bg-background/30">
    <div className="border-b bg-card p-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/plans")}><ArrowLeft /></Button><div><h1 className="font-bold">Day {dayNumber}</h1><Badge variant="outline">{currentPhase.name}</Badge></div></div>
      <Button onClick={complete} disabled={!canEdit}>{task.status === "completed" ? "Completed" : "Mark Complete"}</Button>
    </div>
    <main className="container mx-auto max-w-5xl p-6 space-y-8">
      {loadingGuide ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin" /></div> : guide ? <>
        <Card><CardContent className="p-8 space-y-4"><h2 className="text-2xl font-bold">{guide.brief_explanation || task.title}</h2><p>{guide.description}</p></CardContent></Card>
        <Card><CardContent className="p-8 space-y-4"><h2 className="text-2xl font-bold">Process Workflow</h2>{(guide.workflow || []).map((step, index) => <div key={index} className="p-4 border rounded"><b>{index + 1}. {typeof step === "string" ? step : step.title || "Step"}</b>{typeof step !== "string" && step.details && <p>{step.details}</p>}</div>)}</CardContent></Card>
        <Card><CardContent className="p-8 space-y-4"><h2 className="text-2xl font-bold">Tactical Execution</h2>{steps.map((step, index) => <div key={index} className="flex gap-3"><CheckCircle2 className="text-green-600" /><p>{step}</p></div>)}</CardContent></Card>
        <Card><CardContent className="p-0"><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Record your findings or output here..." className="min-h-[300px] border-0 p-8" /><div className="p-4 border-t"><Button onClick={saveNotes}><Save className="mr-2" /> Save Output Progress</Button></div></CardContent></Card>
      </> : <p>Unable to generate guide. Please try again.</p>}
      {task.steps?.map(step => <button key={step.id} className="flex items-center gap-3 text-left w-full p-3" onClick={() => canEdit && toggleStepCompletion(task.id, step.id)}><span>{step.completed ? "✓" : "○"}</span>{step.title}</button>)}
    </main>
  </div>;
};

export default WorkTask;
