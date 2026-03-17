import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { FlowLine } from "@/components/FlowLine";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, Rocket, CheckCircle2 } from "lucide-react";
import { useStartup } from "@/hooks/useStartup";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/context/PlanContext";
import { supabase } from "@/integrations/supabase/client";

const Processing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshStartups, setActiveStartupId } = useStartup();
  const { user } = useAuth();
  const { setPlan } = usePlan();

  const [pendingData, setPendingData] = useState<any>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingVision");
    if (stored) {
      try {
        setPendingData(JSON.parse(stored));
      } catch (err) {
        console.error("Error parsing pending vision:", err);
        toast({
          title: "Error",
          description: "Failed to load startup data. Please try again.",
          variant: "destructive",
        });
        navigate("/story-intake");
      }
    } else {
      // No pending vision found, redirect to create one
      toast({
        title: "No Startup Found",
        description: "Please create a startup first.",
        variant: "destructive", // Added variant for better visibility
      });
      navigate("/story-intake");
    }
  }, []);

  const processingSteps = [
    { id: "1", label: "Validating Vision", status: "pending" as const },
    { id: "2", label: "Analyzing Market Fit", status: "pending" as const },
    { id: "3", label: "Generating Business Model", status: "pending" as const },
    { id: "4", label: "Creating Execution Plan", status: "pending" as const },
    { id: "5", label: "Setting Up Workspace", status: "pending" as const },
  ];

  // --- MOCK PLAN GENERATOR ---
  const generateMockPlan = (name: string, vision: string, days: number) => {
    const phases = ["Foundation", "Validation", "Development", "Launch", "Growth"];
    const tasksPerPhase = 3;
    const tasks = [];

    let dayOffset = 0;
    const daysPerPhase = Math.ceil(days / phases.length);

    for (const phase of phases) {
      for (let i = 1; i <= tasksPerPhase; i++) {
        tasks.push({
          id: `task-${Date.now()}-${phase}-${i}`,
          title: `${phase} Step ${i}: ${["Research", "Build", "Test"][i - 1] || "Execute"} for ${name}`,
          description: `Detailed instruction for ${phase} phase based on vision: ${vision.substring(0, 20)}...`,
          phase: phase,
          status: "pending",
          day: dayOffset + Math.ceil((i / tasksPerPhase) * daysPerPhase)
        });
      }
      dayOffset += daysPerPhase;
    }

    return {
      title: name,
      summary: `A strategic plan to build ${name}, focusing on ${vision.substring(0, 50)}...`,
      tasks: tasks,
      kpis: ["Customer Acquisition", "Monthly Revenue", "User Retention", "Product Iterations"],
      risks: ["Market competition", "Funding constraints", "Technical complexity", "Regulatory hurdles"]
    };
  };

  const processingRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (processingRef.current) return;
    if (!pendingData?.name) {
      setError("Startup data missing. Please try creating again.");
      return;
    }

    processingRef.current = true;

    try {
      let generatedPlan;

      try {
        // Try the real backend API first
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: pendingData.vision,
            days: pendingData.days || 30
          })
        });

        if (!response.ok) {
          throw new Error("Server returned an error");
        }

        const rawAiResponse = await response.json();

        // Hydrate into full Startup OS Plan
        const totalDays = pendingData.days || 30;
        const { generateFullPlan } = await import("@/lib/planUtils");
        generatedPlan = generateFullPlan(rawAiResponse, totalDays);

      } catch (backendErr) {
        // Backend unreachable or errored — fall back to mock plan generator
        console.warn("Backend unavailable, using local plan generator:", backendErr);
        const rawMock = generateMockPlan(pendingData.name, pendingData.vision, pendingData.days || 30);
        const { generateFullPlan } = await import("@/lib/planUtils");
        try {
          generatedPlan = generateFullPlan(rawMock, pendingData.days || 30);
        } catch {
          // If generateFullPlan fails too, use rawMock directly
          generatedPlan = rawMock;
        }
      }

      // Update global context plan
      setPlan(generatedPlan);

      // --- PERSIST TO SUPABASE ---
      let orgId: string | null = null;
      
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
        
      if (orgMember) {
        orgId = orgMember.organization_id;
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${user?.email?.split('@')[0] || 'My'}'s Organization`,
            code: `org-${Math.random().toString(36).substring(2, 8)}`,
            created_by: user!.id
          })
          .select('id')
          .single();
          
        if (orgError) throw new Error("Failed to create organization: " + orgError.message);
        orgId = newOrg.id;
        
        await supabase
          .from('organization_members')
          .insert({
            organization_id: orgId,
            user_id: user!.id
          });
      }

      const { data: insertedStartup, error: startupError } = await supabase
        .from('startups')
        .insert({
          name: pendingData.name,
          vision: pendingData.vision,
          created_by: user!.id,
          organization_id: orgId,
          plan_data: generatedPlan as any,
          progress: {},
          status: 'active'
        })
        .select()
        .single();
        
      if (startupError) throw new Error("Failed to create startup: " + startupError.message);

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user!.id,
          startup_id: insertedStartup.id,
          role: 'founder'
        });
        
      if (roleError) throw new Error("Failed to assign role: " + roleError.message);

      // --- SYNC TASKS TO SUPABASE TASKS TABLE ---
      try {
        const allTasks: any[] = [];
        (generatedPlan as any)?.phases?.forEach?.((p: any) => {
           p.days?.forEach?.((d: any) => {
              d.tasks?.forEach?.((t: any) => {
                 allTasks.push({
                   startup_id: insertedStartup.id,
                   title: t.title || "Untitled Task",
                   description: t.description || t.title || "No description provided",
                   status: 'todo',
                   created_by: user!.id
                 });
              });
           });
        });

        if (allTasks.length > 0) {
            // Insert in batches of 100 to prevent payload limits
            for (let i = 0; i < allTasks.length; i += 100) {
                const batch = allTasks.slice(i, i + 100);
                await supabase.from('tasks').insert(batch);
            }
        }
      } catch (taskSyncErr) {
        console.error("Non-fatal error syncing tasks to table:", taskSyncErr);
      }

      // Refresh the context to show new startup in sidebar
      await refreshStartups();

      // Set as active
      setActiveStartupId(insertedStartup.id, insertedStartup as any);

      // Mark as complete
      setProcessingComplete(true);

      // Clear storage and redirect
      setTimeout(() => {
        sessionStorage.removeItem("pendingVision");
        navigate("/plans");
      }, 1500);

    } catch (err) {
      console.error("Error completing processing:", err);
      setError("Failed to generate plan: " + (err as Error).message);
      processingRef.current = false;
    }
  }, [pendingData, setPlan, user?.id, refreshStartups, setActiveStartupId, navigate]);


  const handleRetry = () => {
    sessionStorage.removeItem("pendingVision");
    navigate("/story-intake");
  };

  if (error) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="max-w-md text-center p-8">
          <div className="mx-auto mb-6 inline-flex rounded-2xl bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Processing Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
            <Button variant="hero" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!pendingData) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Success Banner when complete */}
        {processingComplete && (
          <div className="mb-8 animate-fade-in opacity-0">
            <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6 text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Startup Created Successfully!
              </h2>
              <p className="text-green-700">
                Redirecting you to your new dashboard...
              </p>
            </div>
          </div>
        )}

        <div className={`text-center mb-8 ${processingComplete ? 'opacity-0' : 'animate-fade-in'}`}>
          <div className="inline-flex rounded-2xl bg-primary/10 p-4 mb-6">
            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Processing Your Vision</h1>
          <p className="text-muted-foreground mb-2">
            Creating <strong className="text-primary">"{pendingData?.name}"</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            This usually takes 15-30 seconds. Please don't close this window.
          </p>
        </div>

        <div className={`rounded-3xl border bg-card p-8 shadow-elevated ${processingComplete ? 'opacity-0' : 'animate-fade-in-up'}`}>
          <FlowLine
            steps={processingSteps}
            onComplete={handleComplete}
          />
        </div>

        {/* Startup Preview */}
        {!processingComplete && (
          <div className="mt-8 animate-fade-in-up opacity-0 stagger-5">
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Rocket className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">Startup Preview</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="font-medium">{pendingData?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vision Length:</span>
                  <span className="font-medium">{pendingData?.vision?.length || 0} characters</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(pendingData?.createdAt || new Date()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!processingComplete && (
          <div className="mt-6 text-center animate-fade-in opacity-0 stagger-6">
            <p className="text-sm text-muted-foreground">
              While we process your vision, think about your first steps:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs">
                Team Members
              </span>
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs">
                First Tasks
              </span>
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs">
                Target Customers
              </span>
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs">
                Budget Planning
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Processing;
