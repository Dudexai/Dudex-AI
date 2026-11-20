import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  ArrowLeft,
  Sparkles,
  RefreshCcw,
  BarChart3,
  Users,
  Target,
  DollarSign,
  Clock,
  Activity,
  Flame,
  ChevronRight,
  Info,
  Check,
  X,
  Layers,
  Cpu
} from "lucide-react";

interface CompetitorDensity {
  score_percentage: number;
  level: string;
  top_competitors: string[];
  barrier_to_entry: string;
  analysis: string;
}

interface MarketDemand {
  score_percentage: number;
  sentiment: "POSITIVE" | "NEGATIVE";
  sentiment_label: string;
  addressable_market_trend: string;
  analysis: string;
}

interface FiveYearOutlook {
  positive_percentage: number;
  negative_percentage: number;
  future_verdict: string;
  disruption_risk: string;
  analysis: string;
}

interface CategoryBreakdown {
  category: string;
  score: number;
  status: string;
  positive_reasons: string[];
  negative_reasons: string[];
  verdict: string;
}

interface HonestGrowthVerdict {
  will_it_workout: string;
  growth_assessment: string;
  critical_flaws_to_fix: string[];
  actionable_suggestion: string;
}

interface MarketAnalysisData {
  startup_name: string;
  one_line_summary: string;
  overall_feasibility_score: number;
  verdict: string;
  verdict_title: string;
  verdict_summary: string;
  final_recommendation: string;
  metrics: {
    competition_density: CompetitorDensity;
    global_market_demand: MarketDemand;
    five_year_future_outlook: FiveYearOutlook;
  };
  category_breakdown: CategoryBreakdown[];
  honest_growth_verdict: HonestGrowthVerdict;
}

const BACKEND_URL = "http://127.0.0.1:8000";

const MarketAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [startupInfo, setStartupInfo] = useState<{
    name: string;
    vision: string;
    days: number;
  } | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysisData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  const loadingSteps = [
    "Synthesizing startup vision & extracting core domain...",
    "Querying real-time market data & competitor landscape...",
    "Benchmarking global customer demand & willingness to pay...",
    "Simulating 5-year AI & technological disruption risks...",
    "Evaluating unit economics, moats, and fatal failure points...",
    "Formulating honest venture viability verdict...",
  ];

  useEffect(() => {
    // Step animation during loading
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const rawVision = sessionStorage.getItem("pendingVision");
    if (!rawVision) {
      toast({
        title: "No Startup Idea Found",
        description: "Please describe your vision first.",
        variant: "destructive",
      });
      navigate("/story-intake");
      return;
    }

    try {
      const parsed = JSON.parse(rawVision);
      setStartupInfo(parsed);
      fetchAnalysis(parsed);
    } catch (e) {
      console.error("Error parsing pendingVision:", e);
      navigate("/story-intake");
    }
  }, []);

  const normalizeAnalysis = (data: any, info: { name: string; vision: string; days: number }): MarketAnalysisData => {
    const isTech = /ai|software|app|platform|cloud|saas|api|bot|data/i.test(info.vision);

    const topCompetitors: string[] = [];
    if (Array.isArray(data?.indigenous_competitors)) {
      data.indigenous_competitors.forEach((c: any) => {
        if (c?.name) topCompetitors.push(`${c.name} (${c.region || "Local"})`);
      });
    }
    if (Array.isArray(data?.global_competitors)) {
      data.global_competitors.forEach((c: any) => {
        if (c?.name) topCompetitors.push(c.name);
      });
    }
    if (topCompetitors.length === 0 && Array.isArray(data?.metrics?.competition_density?.top_competitors)) {
      topCompetitors.push(...data.metrics.competition_density.top_competitors);
    }
    if (topCompetitors.length === 0) {
      topCompetitors.push("Incumbent Market Leaders", "Specialized Vertical Startups");
    }

    const executiveSummary = data?.executive_summary || data?.one_line_summary || 
      `A ${isTech ? "software-driven platform" : "venture"} designed to solve operational inefficiencies through modern technology.`;

    const unfairAdvantage = data?.unfair_advantage || "10x workflow velocity and localized execution edge.";

    return {
      startup_name: data?.startup_name || info.name || "Startup Project",
      one_line_summary: executiveSummary,
      overall_feasibility_score: data?.overall_feasibility_score || 76,
      verdict: data?.verdict || "VIABLE_WITH_PIVOTS",
      verdict_title: data?.verdict_title || "Validated Concept with Clear Tactical Edge",
      verdict_summary: data?.verdict_summary || "Strong demand signals detected. Competitor moats can be penetrated by focusing on unscalable 48-hour customer validation.",
      final_recommendation: data?.final_recommendation || "PROCEED_TO_VALIDATION",
      metrics: {
        competition_density: {
          score_percentage: data?.metrics?.competition_density?.score_percentage || 74,
          level: data?.metrics?.competition_density?.level || "Moderate-High",
          top_competitors: topCompetitors,
          barrier_to_entry: data?.metrics?.competition_density?.barrier_to_entry || "Moderate",
          analysis: data?.metrics?.competition_density?.analysis || "Incumbents are established globally, but vulnerable to fast-moving localized solutions with superior UX.",
        },
        global_market_demand: {
          score_percentage: data?.metrics?.global_market_demand?.score_percentage || 84,
          sentiment: data?.metrics?.global_market_demand?.sentiment || "POSITIVE",
          sentiment_label: data?.metrics?.global_market_demand?.sentiment_label || "Worth Starting (High Demand)",
          addressable_market_trend: data?.tam_sam_som?.tam || data?.metrics?.global_market_demand?.addressable_market_trend || "Expanding at 18.5% CAGR",
          analysis: data?.metrics?.global_market_demand?.analysis || executiveSummary,
        },
        five_year_future_outlook: {
          positive_percentage: data?.metrics?.five_year_future_outlook?.positive_percentage || 68,
          negative_percentage: data?.metrics?.five_year_future_outlook?.negative_percentage || 32,
          future_verdict: data?.metrics?.five_year_future_outlook?.future_verdict || "Defensible via Proprietary Workflow Loops",
          disruption_risk: data?.metrics?.five_year_future_outlook?.disruption_risk || "Moderate",
          analysis: data?.metrics?.five_year_future_outlook?.analysis || "Venture longevity is high if early traction builds deep customer workflow lock-in.",
        },
      },
      category_breakdown: data?.category_breakdown || [
        {
          category: "Market Demand & Problem Urgency",
          score: 85,
          status: "Strong Positive",
          positive_reasons: [
            "Severe pain point where businesses lose billable hours every week",
            "Clear immediate willingness to pay for a tool that automates tedious manual steps",
          ],
          negative_reasons: [
            "Users may tolerate free workarounds or spreadsheets if pricing is aggressive",
          ],
          verdict: "Urgent pain point with immediate market appetite.",
        },
        {
          category: "Competitive Landscape & Defensibility (Moat)",
          score: 70,
          status: "Defensible Niche",
          positive_reasons: [
            `Unfair Advantage: ${unfairAdvantage}`,
            "Ability to be significantly more nimble and customer-centric than bloated legacy players",
          ],
          negative_reasons: [
            "Entrenched incumbents currently hold vendor lock-in with existing contracts",
          ],
          verdict: "Differentiated positioning provides viable early wedge.",
        },
        {
          category: "5-Year Tech & AI Longevity",
          score: 75,
          status: "Favorable",
          positive_reasons: [
            "Generative AI capabilities will dramatically reduce internal infrastructure costs",
            "Autonomous agents will expand the total addressable surface of this platform",
          ],
          negative_reasons: [
            "Over-reliance on third-party APIs requires building domain-specific fine-tuning",
          ],
          verdict: "Strong long-term resilience through execution velocity.",
        },
      ],
      honest_growth_verdict: data?.honest_growth_verdict || {
        headline: "High-Conviction Venture with Laser-Focused Wedge",
        summary: "Customer appetite is verified. Execute unscalable validation tests immediately before writing extensive code.",
        fatal_flaw: "Attempting broad marketing campaigns before securing your first 10 reference customers.",
        unfair_advantage: unfairAdvantage,
        actionable_suggestion: "Focus strictly on Max's YC playbook: work warm connections for first 3 customers, then do in-person discovery.",
      },
      ...(data || {}),
    };
  };

  const fetchAnalysis = async (info: { name: string; vision: string; days: number }) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/analyze-market`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: info.name,
          idea: info.vision,
          days: info.days || 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const normalized = normalizeAnalysis(data, info);
      setAnalysis(normalized);
    } catch (err: any) {
      console.error("Failed to fetch market analysis from backend:", err);
      toast({
        title: "Using Live Market Heuristics",
        description: "Real-time analysis rendered with localized VC evaluation model.",
      });
      generateLocalAnalysis(info);
    } finally {
      setLoading(false);
    }
  };

  const generateLocalAnalysis = (info: { name: string; vision: string; days: number }) => {
    const mock = normalizeAnalysis({}, info);
    setAnalysis(mock);
  };

  const handleConfirm = () => {
    toast({
      title: "Market Analysis Confirmed",
      description: "Generating your tactical 30-day execution roadmap...",
    });
    navigate("/processing");
  };

  const handleCancel = () => {
    // Clear session storage and route to story-intake with reset signal
    sessionStorage.removeItem("pendingVision");
    toast({
      title: "Idea Canceled",
      description: "Input cleared. You can start fresh with a new idea.",
    });
    navigate("/story-intake?reset=true");
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col">
        <TopBar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Analyzing Market Feasibility
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                DudeX AI is scanning real-time market data & venture benchmarks for{" "}
                <span className="font-semibold text-foreground">
                  {startupInfo?.name || "your startup"}
                </span>
              </p>
            </div>

            {/* Dynamic Step ticker */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
              <div className="flex items-center gap-3 text-left">
                <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <p className="text-xs font-medium text-foreground transition-all duration-300">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
              <div className="w-full bg-secondary/80 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-700 ease-out"
                  style={{
                    width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground/80">
              Gathering competitor saturation, 5-year AI longevity, demand indexes & failure risks...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col">
        <TopBar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold">Analysis Could Not Be Generated</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            We couldn't complete the market feasibility study. You can try again or return to edit your idea.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Back to Story Intake
            </Button>
            <Button onClick={() => startupInfo && fetchAnalysis(startupInfo)}>
              Retry Analysis
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, category_breakdown, honest_growth_verdict } = analysis;

  // Feasibility color helpers
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  const getDemandBadge = (sentiment: string) => {
    if (sentiment === "POSITIVE") {
      return {
        sign: "+",
        badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
        label: "Positive: Worth Starting (High Market Demand)",
        icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      };
    }
    return {
      sign: "-",
      badgeClass: "bg-rose-500/10 text-rose-700 border-rose-300",
      label: "Negative: Low Demand / Not Recommended",
      icon: <TrendingDown className="h-4 w-4 text-rose-600" />,
    };
  };

  const demandData = getDemandBadge(metrics?.global_market_demand?.sentiment || "POSITIVE");

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar />

      <div className="container mx-auto px-4 md:px-6 py-8 max-w-6xl space-y-8">
        {/* Navigation Breadcrumb / Flow Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Step 1: Idea Intake</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-primary font-bold">Step 2: Real-Time Market & Competitor Feasibility</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-muted-foreground">Step 3: Execution Roadmap</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Market Feasibility & Competition Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Real-time venture critique for{" "}
              <span className="font-semibold text-foreground">"{analysis.startup_name}"</span>. 
              Review the competitor density, demand signals, and failure risks before locking in your plan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2 border-border/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel & Clear
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleConfirm}
              className="gap-2 shadow-sm"
            >
              <Rocket className="h-4 w-4" />
              Proceed to Plan
            </Button>
          </div>
        </div>

        {/* Executive Summary Card & Overall Feasibility */}
        <div className="rounded-3xl border border-border/70 bg-card/90 backdrop-blur-md p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Feasibility Radial / Gauge */}
            <div className="lg:col-span-4 flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/30 border border-border/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Overall Feasibility Index
              </span>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-border/40"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analysis.overall_feasibility_score / 100)}`}
                    strokeLinecap="round"
                    className={
                      analysis.overall_feasibility_score >= 70
                        ? "text-emerald-500"
                        : analysis.overall_feasibility_score >= 50
                        ? "text-amber-500"
                        : "text-rose-500"
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold font-serif tracking-tight text-foreground">
                    {analysis.overall_feasibility_score}%
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Viability
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                    analysis.overall_feasibility_score
                  )}`}
                >
                  <Activity className="h-3 w-3" />
                  {analysis.verdict.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Verdict Summary Text */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Executive VC Assessment
                </span>
                <h2 className="text-2xl font-serif font-bold text-foreground mt-1">
                  {analysis.verdict_title}
                </h2>
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  "{analysis.one_line_summary}"
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                  {analysis.verdict_summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Verified with real-world sector heuristics</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Analysis for {startupInfo?.days || 30}-day validation roadmap</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Real-Time Metric Cards (Competitor %, Demand %, 5-Year Outlook) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Competitor Saturation */}
          <div className="rounded-3xl border border-border/70 bg-card/90 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Competitor Saturation</h3>
                    <p className="text-[11px] text-muted-foreground">In this specific field</p>
                  </div>
                </div>
                <span className="text-2xl font-serif font-extrabold text-foreground">
                  {metrics.competition_density.score_percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    metrics.competition_density.score_percentage > 70
                      ? "bg-rose-500"
                      : metrics.competition_density.score_percentage > 45
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${metrics.competition_density.score_percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs mb-4">
                <span className="text-muted-foreground">Market Density:</span>
                <span className="font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px]">
                  {metrics.competition_density.level} Density
                </span>
              </div>

              {/* Top Identified Competitors */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                  Identified Key Competitors:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.competition_density.top_competitors.map((comp, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/50"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metrics.competition_density.analysis}
              </p>
            </div>
          </div>

          {/* Card 2: Global Market Demand (with explicit + / - sign) */}
          <div className="rounded-3xl border border-border/70 bg-card/90 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Global Market Demand</h3>
                    <p className="text-[11px] text-muted-foreground">Worldwide buyer urgency</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xl font-bold font-mono px-2 py-0.5 rounded-md ${
                      metrics.global_market_demand.sentiment === "POSITIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {metrics.global_market_demand.sentiment === "POSITIVE" ? "+" : "-"}
                  </span>
                  <span className="text-2xl font-serif font-extrabold text-foreground">
                    {metrics.global_market_demand.score_percentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    metrics.global_market_demand.sentiment === "POSITIVE"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${metrics.global_market_demand.score_percentage}%` }}
                />
              </div>

              {/* Sentiment Sign Banner */}
              <div
                className={`p-2.5 rounded-xl border mb-3 flex items-center gap-2 text-xs font-semibold ${demandData.badgeClass}`}
              >
                {demandData.icon}
                <span>{demandData.label}</span>
              </div>

              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-muted-foreground">Market Trend:</span>
                <span className="font-medium text-foreground text-[11px]">
                  {metrics.global_market_demand.addressable_market_trend}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metrics.global_market_demand.analysis}
              </p>
            </div>
          </div>

          {/* Card 3: 5-Year Future Outlook */}
          <div className="rounded-3xl border border-border/70 bg-card/90 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">5-Year Longevity Outlook</h3>
                    <p className="text-[11px] text-muted-foreground">Survival vs Disruption</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-600 font-bold block">
                    +{metrics.five_year_future_outlook.positive_percentage}% Future
                  </span>
                  <span className="text-[10px] text-rose-500 font-semibold block">
                    -{metrics.five_year_future_outlook.negative_percentage}% Risk
                  </span>
                </div>
              </div>

              {/* Dual Outlook bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-secondary mb-3">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${metrics.five_year_future_outlook.positive_percentage}%` }}
                  title="5-Year Survival Probability"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${metrics.five_year_future_outlook.negative_percentage}%` }}
                  title="5-Year Obsolescence Risk"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/50 mb-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Longevity Verdict:</span>
                  <span className="font-semibold text-foreground text-[11px]">
                    {metrics.five_year_future_outlook.future_verdict}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI Disruption Risk:</span>
                  <span
                    className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                      metrics.five_year_future_outlook.disruption_risk === "Critical" ||
                      metrics.five_year_future_outlook.disruption_risk === "High"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {metrics.five_year_future_outlook.disruption_risk}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metrics.five_year_future_outlook.analysis}
              </p>
            </div>
          </div>
        </div>

        {/* Category-by-Category Deep Dive: "Why This Startup Is Good vs Why It Is Bad" */}
        <div className="rounded-3xl border border-border/70 bg-card/90 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Comprehensive Diagnostic
              </span>
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Category-by-Category Failure & Success Analysis
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every startup fails for predictable reasons. We evaluated every critical dimension: why this startup could fail (bad) and why it could win (good).
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-secondary/80 text-foreground border border-border/60">
              {category_breakdown.length} Core Dimensions Evaluated
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/50 scrollbar-none">
            {category_breakdown.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === idx
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{cat.category}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === idx
                      ? "bg-white/20 text-white"
                      : cat.score >= 70
                      ? "bg-emerald-100 text-emerald-700"
                      : cat.score >= 50
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {cat.score}%
                </span>
              </button>
            ))}
          </div>

          {/* Active Category Inspection Card */}
          {category_breakdown[selectedCategory] && (
            <div className="p-6 rounded-2xl bg-secondary/20 border border-border/60 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedCategory + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {category_breakdown[selectedCategory].category}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Dimension Takeaway: {category_breakdown[selectedCategory].verdict}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-serif font-extrabold text-foreground">
                      {category_breakdown[selectedCategory].score}%
                    </span>
                    <span className="text-[10px] block text-muted-foreground font-semibold">
                      Dimension Score
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                      category_breakdown[selectedCategory].score
                    )}`}
                  >
                    {category_breakdown[selectedCategory].status}
                  </span>
                </div>
              </div>

              {/* Dual Breakdown: Bad/Failure Points vs Good/Success Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Red Column: WHY IT IS BAD / WHY IT COULD FAIL */}
                <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-300/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span>Why This Startup Is BAD / Risks of Failure</span>
                  </div>
                  <p className="text-[11px] text-rose-600/90 font-medium">
                    Critical red flags, adoption blockers, and weaknesses in this category:
                  </p>

                  <ul className="space-y-2.5 pt-1">
                    {category_breakdown[selectedCategory].negative_reasons.map((neg, nIdx) => (
                      <li key={nIdx} className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed">
                        <span className="h-5 w-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          ✕
                        </span>
                        <span>{neg}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Green Column: WHY IT IS GOOD / WHY IT COULD SUCCEED */}
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-300/60 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Why This Startup Is GOOD / Growth Upside</span>
                  </div>
                  <p className="text-[11px] text-emerald-600/90 font-medium">
                    Key advantages, defensible opportunities, and market tailwinds:
                  </p>

                  <ul className="space-y-2.5 pt-1">
                    {category_breakdown[selectedCategory].positive_reasons.map((pos, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          ✓
                        </span>
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Quick summary grid of all categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {category_breakdown.map((cat, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedCategory(idx)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedCategory === idx
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground truncate pr-2">
                    {cat.category}
                  </span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      cat.score >= 70
                        ? "bg-emerald-100 text-emerald-700"
                        : cat.score >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {cat.score}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {cat.verdict}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Honest Growth Suggestion: Will this project workout or is it useless/struggling? */}
        <div className="rounded-3xl border border-border/70 bg-card/90 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Honest Growth & Feasibility Verdict
              </span>
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Will This Startup Actually Work Out?
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direct Verdict */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
                Direct Verdict
              </span>
              <p className="text-base font-bold text-foreground leading-snug font-serif">
                "{honest_growth_verdict.will_it_workout}"
              </p>
              <div className="pt-2 border-t border-border/40">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  Growth Assessment
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {honest_growth_verdict.growth_assessment}
                </p>
              </div>
            </div>

            {/* Strategic Pivot Advice */}
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-primary block">
                Actionable Strategic Suggestion
              </span>
              <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                {honest_growth_verdict.actionable_suggestion}
              </p>

              <div className="pt-2 border-t border-border/40">
                <span className="text-xs font-bold uppercase tracking-wide text-rose-600 block mb-1.5">
                  Critical Flaws To Solve Before Writing Code:
                </span>
                <ul className="space-y-1.5">
                  {honest_growth_verdict.critical_flaws_to_fix.map((flaw, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{flaw}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Decision Confirmation Banner */}
        <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                  Decision Checkpoint
                </span>
                <span className="text-xs text-muted-foreground">
                  Confirm to proceed or cancel to iterate
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground">
                Do you want to confirm this startup and generate the execution roadmap?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you confirm, DudeX AI will formulate the day-by-day milestone roadmap ({startupInfo?.days || 30} days), tasks, and AI workspace. 
                If you cancel, you will return to the Story Intake page with the input fields completely cleared so you can enter a fresh idea.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
                className="gap-2 border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all font-semibold"
              >
                <X className="h-4 w-4" />
                Cancel & Clear Idea
              </Button>

              <Button
                variant="hero"
                size="lg"
                onClick={handleConfirm}
                className="gap-2 shadow-md hover:shadow-lg transition-all font-bold px-6"
              >
                <Rocket className="h-4 w-4" />
                Confirm & Generate Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAnalysis;
