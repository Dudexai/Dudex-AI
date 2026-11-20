import React, { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useStartup } from "@/hooks/useStartup";
import {
  Bot,
  Sparkles,
  TrendingUp,
  Search,
  Send,
  Video,
  Mail,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Target,
  Zap,
  ShieldCheck,
  Flame,
  ArrowRight,
  Layers,
  Globe,
  Compass,
} from "lucide-react";

const BACKEND_URL = "http://127.0.0.1:8000";

export const Agents = () => {
  const { toast } = useToast();
  const { activeStartup } = useStartup();

  const [activeTab, setActiveTab] = useState("analyzing");

  // Slack Connection Status
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState("");

  // Agent 1: Analyzing Agent State
  const [analyzingLoading, setAnalyzingLoading] = useState(false);
  const [startupName, setStartupName] = useState(activeStartup?.name || "DudeX AI");
  const [ideaText, setIdeaText] = useState(
    activeStartup?.vision || "AI-powered autonomous startup co-founder OS that unifies market research, YC sales playbooks, and operations into one execution engine."
  );
  const [targetRegion, setTargetRegion] = useState("India & Global");
  const [marketResult, setMarketResult] = useState<any>(null);

  // Agent 2: Marketing Agent State
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [targetIcp, setTargetIcp] = useState("Early-stage tech founders, solo entrepreneurs, hackathon builders");
  const [marketingResult, setMarketingResult] = useState<any>(null);
  const [slackSending, setSlackSending] = useState(false);
  const [selectedSlackChannel, setSelectedSlackChannel] = useState("#social");

  // Agent 3: Operations Agent State
  const [opsLoading, setOpsLoading] = useState(false);
  const [jitsiLink, setJitsiLink] = useState("");
  const [meetingProspect, setMeetingProspect] = useState("");
  const [opsResult, setOpsResult] = useState<any>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check Slack status on mount
  useEffect(() => {
    const checkSlack = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/slack/status`);
        if (res.ok) {
          const data = await res.json();
          setSlackConnected(data.connected);
          setSlackTeam(data.team || "Dudexai");
        }
      } catch (err) {
        console.error("Slack check error:", err);
      }
    };
    checkSlack();
  }, []);

  // Agent 1 Handler: Market & Competitor Intelligence
  const handleRunAnalysis = async () => {
    setAnalyzingLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/analyze-market`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaText,
          startup_name: startupName,
          target_region: targetRegion,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarketResult(data);
      toast({
        title: "Market Intelligence Complete",
        description: `Discovered competitors and 48-hr validation roadmap for ${startupName}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error running analysis",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzingLoading(false);
    }
  };

  // Agent 2 Handler: Marketing & Growth Engine
  const handleRunMarketing = async () => {
    setMarketingLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/marketing-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup_name: startupName,
          vision: ideaText,
          current_phase: "Validation",
          target_icp: targetIcp,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarketingResult(data);
      toast({
        title: "Growth Blueprint Ready",
        description: "Embedded YC playbooks, <75-word email, and ICE experiments generated.",
      });
    } catch (err: any) {
      toast({
        title: "Error running marketing agent",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setMarketingLoading(false);
    }
  };

  // Agent 2 Handler: Post Alert to Slack
  const handlePostSlackAlert = async () => {
    if (!marketingResult) return;
    setSlackSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/slack/post-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup_name: startupName,
          growth_data: marketingResult,
          channel: selectedSlackChannel,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({
          title: "🚀 Slack Growth Alert Sent!",
          description: `Dispatched directly to ${selectedSlackChannel} in ${slackTeam} workspace.`,
        });
      } else {
        throw new Error("Failed to post message to Slack channel");
      }
    } catch (err: any) {
      toast({
        title: "Slack dispatch failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSlackSending(false);
    }
  };

  // Agent 3 Handler: Generate Instant Jitsi Meeting
  const handleGenerateJitsi = () => {
    const room = `dudex-${startupName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
    const url = `https://meet.jit.si/${room}`;
    setJitsiLink(url);
    toast({
      title: "Video Call Room Generated",
      description: "Secure, zero-download Jitsi meeting created.",
    });
  };

  // Agent 3 Handler: Generate Social & Email Copy
  const handleGenerateOpsCopy = async () => {
    setOpsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/operations-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "social_copy",
          context_data: {
            startup_name: startupName,
            vision: ideaText,
            target_audience: targetIcp,
            key_announcement: "Official hackathon launch of our autonomous AI co-founder team!",
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOpsResult(data);
      toast({
        title: "Communications Pack Ready",
        description: "Generated LinkedIn hook, Twitter thread, and follow-up copy.",
      });
    } catch (err: any) {
      toast({
        title: "Error generating operations copy",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setOpsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/dashboard" />

      <div className="container mx-auto px-4 md:px-6 py-8 max-w-6xl space-y-8">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                Dual-Engine AI Intelligence
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Gemini 3 Flash Ready
              </Badge>
              {slackConnected && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 py-1">
                  Slack: {slackTeam}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              Autonomous AI Co-Founder Suite
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl mt-1">
              Three autonomous agents working in sync to validate competitors, execute YC sales tactics, and automate founder communications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleRunAnalysis();
                handleRunMarketing();
              }}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
            >
              <Zap className="h-4 w-4" />
              Run Full Co-Founder Run
            </Button>
          </div>
        </div>

        {/* Multi-Agent Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto h-12 p-1 bg-card border shadow-sm">
            <TabsTrigger value="analyzing" className="gap-2 font-medium">
              <Search className="h-4 w-4 text-blue-500" />
              <span>1. Analyzing Agent</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2 font-medium">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>2. Marketing Agent</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2 font-medium">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>3. Operations Agent</span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: ANALYZING AGENT */}
          {/* ========================================================================= */}
          <TabsContent value="analyzing" className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Market & Competitor Intelligence</CardTitle>
                      <CardDescription>
                        Segregates Indigenous (local) vs Global market competitors, calculates TAM/SAM/SOM, and designs 48-hr validation experiments.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Agent 1 • Gemini 3 Flash
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Startup Name</label>
                    <Input
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder="e.g. DudeX AI"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Target Region / Market</label>
                    <Input
                      value={targetRegion}
                      onChange={(e) => setTargetRegion(e.target.value)}
                      placeholder="e.g. India & Global, Southeast Asia, US B2B"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Idea & Problem Statement</label>
                  <Textarea
                    rows={3}
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="Describe what problem you are solving and for whom..."
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleRunAnalysis}
                  disabled={analyzingLoading}
                  className="w-full sm:w-auto gap-2"
                >
                  {analyzingLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Analyzing Competitors & Moats...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Execute Competitor Reconnaissance
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Display */}
            {marketResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Unfair Advantage & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                        <Target className="h-4 w-4" />
                        Unfair Advantage & Strategic Wedge
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base font-semibold text-foreground">
                        {marketResult.unfair_advantage || "10x workflow velocity and localized execution edge."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {marketResult.one_line_summary || marketResult.executive_summary}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">TAM / SAM / SOM Sizing</div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">TAM:</span>
                        <span className="font-bold">{marketResult.tam_sam_som?.tam || "$10B+"}</span>
                      </div>
                      <div className="flex justify-between border-b py-1">
                        <span className="text-muted-foreground">SAM:</span>
                        <span className="font-semibold">{marketResult.tam_sam_som?.sam || "$2B"}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">SOM (18 Mo):</span>
                        <span className="font-semibold text-primary">{marketResult.tam_sam_som?.som || "$50M"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Indigenous vs Global Competitors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Indigenous / Local */}
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-card/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Compass className="h-4 w-4 text-orange-500" />
                          <CardTitle className="text-base">Indigenous (Regional / Domestic) Competitors</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                          Localized Edge
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {(marketResult.indigenous_competitors || [
                        { name: "Keka / Darwinbox", region: "India", strengths: "Localized compliance & payroll", weaknesses: "Rigid UI, enterprise bloat" },
                        { name: "LeapClub / GrowthX", region: "India", strengths: "High local founder trust", weaknesses: "Manual cohorts, high cost" }
                      ]).map((comp: any, idx: number) => (
                        <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border/40 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{comp.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{comp.region || "Domestic"}</span>
                          </div>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            <strong>Their Edge:</strong> {comp.strengths}
                          </p>
                          <p className="text-rose-600 dark:text-rose-400">
                            <strong>Vulnerability:</strong> {comp.weaknesses}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Global Competitors */}
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-card/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <CardTitle className="text-base">Global Market Leaders</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                          Incumbents
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {(marketResult.global_competitors || [
                        { name: "Notion / Jira", pricing_model: "Freemium SaaS", vulnerabilities: "No automated execution; just empty canvases" },
                        { name: "Apollo.io / HubSpot", pricing_model: "Per-seat subscription", vulnerabilities: "Expensive; lacks early unscalable validation playbooks" }
                      ]).map((comp: any, idx: number) => (
                        <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border/40 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{comp.name}</span>
                            <span className="text-[10px] text-muted-foreground">{comp.pricing_model || "SaaS"}</span>
                          </div>
                          <p className="text-rose-600 dark:text-rose-400">
                            <strong>Where they fail:</strong> {comp.vulnerabilities}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* 48-Hour Unscalable Validation Experiments */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base">48-Hour Unscalable Validation Experiments (YC Playbook)</CardTitle>
                    </div>
                    <CardDescription>
                      Manual tests you must run in the next 48 hours to validate buyer urgency before writing code.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(marketResult.market_validation_experiments || [
                      { step: 1, test_name: "Warm Network Audit", method: "Reach out to 5 former colleagues or classmates in the exact role.", metric: "3 calls booked within 24 hours." },
                      { step: 2, test_name: "Reddit DM Teardown", method: "Find 3 active Reddit threads complaining about this pain point and DM author with free advice.", metric: "1 reply agreeing to a 15-min discovery call." },
                      { step: 3, test_name: "In-Person Customer Walkthrough", method: "Visit a local office or meetup where target buyers gather in person.", metric: "2 verbal problem validations." }
                    ]).map((exp: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {exp.step || idx + 1}
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-sm text-foreground">{exp.test_name}</p>
                          <p className="text-muted-foreground">{exp.method}</p>
                          <p className="text-primary font-medium">🎯 Success Metric: {exp.metric}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: MARKETING & GROWTH AGENT */}
          {/* ========================================================================= */}
          <TabsContent value="marketing" className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Marketing & Outbound Growth Engine</CardTitle>
                      <CardDescription>
                        Implements Max's YC Sales Tactics (Customers 1-10), Brian Halligan's HubSpot Scaling, Sean Ellis ICE Growth loops, and live Slack alerts.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Agent 2 • Growth Engine
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Target ICP (Ideal Customer Profile)</label>
                  <Input
                    value={targetIcp}
                    onChange={(e) => setTargetIcp(e.target.value)}
                    placeholder="e.g. Sales leaders, B2B founders, property managers"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleRunMarketing}
                  disabled={marketingLoading}
                  className="w-full sm:w-auto gap-2"
                >
                  {marketingLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Generating Outbound Blueprint...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Generate Customer Acquisition Blueprint
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Display */}
            {marketingResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Live Slack Dispatch Card */}
                <Card className="border-blue-500/30 bg-blue-500/5 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                        <Send className="h-4 w-4" />
                        Live Slack Ecosystem Alert
                      </div>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                        Slack Bot: buildathon_api
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Post this week's prioritized growth tests directly into your Dudexai team Slack channel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-center gap-3">
                    <select
                      value={selectedSlackChannel}
                      onChange={(e) => setSelectedSlackChannel(e.target.value)}
                      className="h-9 px-3 rounded-md border bg-background text-sm w-full sm:w-48"
                    >
                      <option value="#social">#social</option>
                      <option value="#general">#general</option>
                      <option value="#all-dudexai">#all-dudexai</option>
                    </select>

                    <Button
                      onClick={handlePostSlackAlert}
                      disabled={slackSending}
                      className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {slackSending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Posting to Slack...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Growth Alert to Slack
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* YC Sales Tactics Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        Customers 1 – 3
                      </Badge>
                      <CardTitle className="text-sm">Warm Network Only</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                      {(marketingResult.sales_playbook_milestones?.customers_1_to_3_tactics || [
                        "Message 10 former colleagues and classmates personally.",
                        "Ask 2nd-degree LinkedIn connections for warm introductions."
                      ]).map((t: string, i: number) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="text-primary font-bold">•</span> {t}
                        </p>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <Badge variant="outline" className="w-fit bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                        Customers 4 – 10
                      </Badge>
                      <CardTitle className="text-sm">Unscalable Manual Hustle</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                      {(marketingResult.sales_playbook_milestones?.customers_4_to_10_tactics || [
                        "Walk industry conference floors and book Calendly slots back-to-back.",
                        "Host a founder micro-dinner with 4 target buyers for genuine feedback."
                      ]).map((t: string, i: number) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span> {t}
                        </p>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                        Customers 10 – 50
                      </Badge>
                      <CardTitle className="text-sm">Apollo Scaled Outbound</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                      {(marketingResult.sales_playbook_milestones?.customers_10_to_50_tactics || [
                        "Build targeted Apollo.io lead lists enriched by technology filters.",
                        "Deploy automated 3-step sequences maintaining strict <75-word limit."
                      ]).map((t: string, i: number) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span> {t}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Outbound Cold Email (<75 words rule) */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Outbound Cold Email (Strictly &lt;75 Words)</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600">
                        {marketingResult.outbound_templates?.cold_email?.word_count || 62} words
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      YC Rule: Under 75 words, advice/mentorship framing, single CTA, 1-minute out-loud sanity check.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border/40 font-mono text-xs space-y-2">
                      <div className="text-muted-foreground">
                        <strong>Subject:</strong> {marketingResult.outbound_templates?.cold_email?.subject || "quick question about founder tooling"}
                      </div>
                      <div className="whitespace-pre-line text-foreground">
                        {marketingResult.outbound_templates?.cold_email?.body ||
                          "Hi [First Name],\n\nI saw your work building high-velocity teams. We're developing DudeX AI to help early-stage founders eliminate operational chaos and validate competitors in 48 hours.\n\nWould you be open to sharing 10 minutes of candid advice on what's currently slowing down your execution?\n\nBest,\n[Your Name]"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(marketingResult.outbound_templates?.cold_email?.body || "", "cold_email")}
                      className="gap-2 text-xs"
                    >
                      {copiedId === "cold_email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Email Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Sean Ellis ICE Growth Experiments */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-base">Sean Ellis ICE Growth Experiment Board</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      High-tempo experimentation: 3–5 tests per week scored on Impact, Confidence, and Ease.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(marketingResult.ice_growth_experiments || [
                      { experiment: "Targeted Reddit DMs in r/startups with free teardowns", impact: 8, confidence: 7, ease: 9, ice_score: 24 },
                      { experiment: "Host 4-person virtual founder coffee on Zoom/Jitsi", impact: 7, confidence: 8, ease: 8, ice_score: 23 },
                      { experiment: "Apollo cold sequence to seed-stage founders", impact: 9, confidence: 6, ease: 7, ice_score: 22 }
                    ]).map((exp: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-card border rounded-lg text-xs">
                        <span className="font-semibold text-foreground max-w-md">{exp.experiment}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-muted-foreground">I:{exp.impact} C:{exp.confidence} E:{exp.ease}</span>
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                            ICE: {exp.ice_score || exp.impact + exp.confidence + exp.ease}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: OPERATIONS & COMMUNICATIONS AGENT */}
          {/* ========================================================================= */}
          <TabsContent value="operations" className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Operations & Communications Agent</CardTitle>
                      <CardDescription>
                        Generates instant Jitsi video interview rooms, transactional follow-up emails, and omnichannel social announcements.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Agent 3 • Operations
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Instant Jitsi Meeting Generator */}
                <div className="p-4 bg-card rounded-xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Video className="h-4 w-4 text-emerald-600" />
                      Instant Jitsi Customer Discovery Video Call
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                      Zero-Install • 100% Free
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generate an instant, secure video call room for customer validation and investor discussions.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleGenerateJitsi} size="sm" className="gap-2">
                      <Video className="h-4 w-4" />
                      Generate Video Room Link
                    </Button>

                    {jitsiLink && (
                      <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <Input value={jitsiLink} readOnly className="font-mono text-xs bg-secondary/50" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(jitsiLink, "jitsi")}
                          className="shrink-0"
                        >
                          {copiedId === "jitsi" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(jitsiLink, "_blank")}
                          className="shrink-0 gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Call
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Communications Copy Generator */}
                <div className="space-y-3">
                  <Button
                    onClick={handleGenerateOpsCopy}
                    disabled={opsLoading}
                    variant="outline"
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {opsLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Drafting Communications Pack...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Draft Launch Announcements & Follow-up Copy
                      </>
                    )}
                  </Button>

                  {opsResult && (
                    <div className="space-y-4 animate-fade-in pt-2">
                      {/* LinkedIn Hook */}
                      <Card className="border-border/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase text-muted-foreground">LinkedIn Thought Leadership Post</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="p-3 bg-secondary/50 rounded-lg text-xs whitespace-pre-line font-mono">
                            {opsResult.social_posts?.linkedin ||
                              `🚀 Exciting news: We just unveiled ${startupName} at the Google Buildathon!\n\n90% of early-stage startups fail because they spend weeks coding in isolation without validating customer demand.\n\nWe built DudeX AI to serve as an autonomous AI co-founder team powered by Google Gemini 3 Flash.\n\nTry it live: https://work.dudexai.com\n\n#GoogleBuildathon #AI #Startups #Gemini #BuildInPublic`}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(opsResult.social_posts?.linkedin || "", "linkedin")}
                            className="gap-1.5 text-xs"
                          >
                            {copiedId === "linkedin" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy LinkedIn Post
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Twitter Thread */}
                      <Card className="border-border/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase text-muted-foreground">Twitter / X 3-Tweet Viral Thread</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="p-3 bg-secondary/50 rounded-lg text-xs space-y-2 font-mono">
                            {(opsResult.social_posts?.twitter_thread || [
                              "1/3 Most startups die in the 'execution valley of death'. We built DudeX AI to solve it.",
                              "2/3 Powered by Google Gemini 3 Flash, our multi-agent suite dissects competitors, writes YC-style cold emails, and posts live alerts to Slack in real time.",
                              "3/3 Check out our repo and live demo for the Google Buildathon: https://github.com/Dudexai/Google_Buildathon_DudeX_AI"
                            ]).map((tweet: string, i: number) => (
                              <p key={i} className="border-b last:border-0 pb-1 text-foreground">
                                {tweet}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Agents;
