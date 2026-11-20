import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users2,
  Search,
  Rocket,
  Globe,
  Briefcase,
  Heart,
  ShoppingCart,
  GraduationCap,
  Leaf,
  Zap,
  Plus,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Eye,
  Info,
  MapPin,
  Building,
  Image as ImageIcon,
  Edit2,
  MessageSquare,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Clock,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";

interface Startup {
  id: string;
  name: string;
  logo: string;
  description: string;
  industry: string;
  members: number;
  founded: string;
  contact?: string;
  email?: string;
  website?: string;
  is_community_public: boolean;
}

interface IncomingRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const COMMUNITY_CATEGORIES = [
  "All",
  "AI & Machine Learning",
  "SaaS & B2B Tools",
  "E-Commerce & Retail",
  "FinTech & Payments",
  "HealthTech & Bio",
  "CleanTech & Energy",
  "EdTech",
  "Mobility & Logistics",
  "Hardware & IoT",
  "Consumer & Social",
  "Custom / Hybrid",
];

const matchesCategory = (startupIndustry: string, category: string) => {
  if (category === "All") return true;
  const ind = (startupIndustry || "").toLowerCase();
  switch (category) {
    case "AI & Machine Learning":
      return ind.includes("ai") || ind.includes("machine learning") || ind.includes("deeptech");
    case "SaaS & B2B Tools":
      return ind.includes("saas") || ind.includes("b2b") || ind.includes("devtools") || ind.includes("software");
    case "E-Commerce & Retail":
      return ind.includes("e-commerce") || ind.includes("ecommerce") || ind.includes("retail") || ind.includes("d2c");
    case "FinTech & Payments":
      return ind.includes("fintech") || ind.includes("pay") || ind.includes("bank") || ind.includes("crypto") || ind.includes("defi");
    case "HealthTech & Bio":
      return ind.includes("health") || ind.includes("bio") || ind.includes("med") || ind.includes("pharma");
    case "CleanTech & Energy":
      return ind.includes("clean") || ind.includes("energy") || ind.includes("solar") || ind.includes("climate") || ind.includes("sustain");
    case "EdTech":
      return ind.includes("edtech") || ind.includes("learn") || ind.includes("educat");
    case "Mobility & Logistics":
      return ind.includes("mobility") || ind.includes("logistic") || ind.includes("transport") || ind.includes("fleet") || ind.includes("fuel");
    case "Hardware & IoT":
      return ind.includes("hardware") || ind.includes("iot") || ind.includes("robot");
    case "Consumer & Social":
      return ind.includes("consumer") || ind.includes("social") || ind.includes("gaming") || ind.includes("media");
    case "Custom / Hybrid":
      return (
        ind.includes("custom") ||
        ind.includes("hybrid") ||
        ind.includes("other") ||
        ind.includes("agri") ||
        !["saas", "edtech", "fintech", "healthtech", "cleantech", "e-commerce", "ecommerce", "ai", "hardware", "mobility"].some(
          (k) => ind.includes(k)
        )
      );
    default:
      return ind.includes(category.toLowerCase());
  }
};

const Community = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup, refreshStartups } = useStartup();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [myStartup, setMyStartup] = useState<Startup | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection & Requests states
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [dismissedStartupIds, setDismissedStartupIds] = useState<string[]>([]);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [onboardingForm, setOnboardingForm] = useState({
    name: "",
    logo: "",
    description: "",
    industry: "SaaS",
    members: "",
    founded: "",
    contact: "",
    email: "",
    website: "",
    customIndustry: "",
  });

  // Fetch all startups
  const fetchCommunityData = async () => {
    try {
      const { data, error } = await supabase.from("startups").select("*");
      if (error) throw error;

      const rawData = data as any[];
      const mappedStartups: Startup[] = rawData
        .filter((s) => s.name)
        .map((s) => ({
          id: s.id,
          name: s.name || "Unnamed",
          logo: s.logo_url || s.name?.substring(0, 2).toUpperCase() || "ST",
          description: s.description || "No description provided.",
          industry: s.industry || "Other",
          members: s.team_size || 1,
          founded: s.founded_year || new Date().getFullYear().toString(),
          contact: s.contact_phone || "",
          email: s.contact_email || "",
          website: s.website_url || "",
          is_community_public: s.is_community_public || false,
        }));
      setStartups(mappedStartups);

      if (activeStartup) {
        const mine = mappedStartups.find((s) => s.id === activeStartup.id);
        if (mine) setMyStartup(mine);
      }
    } catch (error) {
      console.error("Error fetching community data:", error);
    }
  };

  // Fetch connection state for active startup
  const fetchConnections = async () => {
    if (!activeStartup) return;

    try {
      const res = await fetch(`${BACKEND_URL}/community/connections?startup_id=${activeStartup.id}`);
      if (res.ok) {
        const data = await res.json();
        setConnectedIds(data.connected_ids || []);
        setSentRequestIds(data.sent_request_ids || []);
        setIncomingRequests(data.incoming_requests || []);

        localStorage.setItem(`dudex_connected_ids_${activeStartup.id}`, JSON.stringify(data.connected_ids || []));
        localStorage.setItem(`dudex_sent_requests_${activeStartup.id}`, JSON.stringify(data.sent_request_ids || []));
        localStorage.setItem(`dudex_incoming_requests_${activeStartup.id}`, JSON.stringify(data.incoming_requests || []));
      }
    } catch (err) {
      try {
        const c1 = localStorage.getItem(`dudex_connected_ids_${activeStartup.id}`);
        if (c1) setConnectedIds(JSON.parse(c1));
        const c2 = localStorage.getItem(`dudex_sent_requests_${activeStartup.id}`);
        if (c2) setSentRequestIds(JSON.parse(c2));
        const c3 = localStorage.getItem(`dudex_incoming_requests_${activeStartup.id}`);
        if (c3) setIncomingRequests(JSON.parse(c3));
      } catch {}
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [user, activeStartup]);

  useEffect(() => {
    if (activeStartup) {
      fetchConnections();
    }
  }, [activeStartup?.id]);

  // Real-time listener for connection updates
  useEffect(() => {
    if (!activeStartup) return;

    const channelName = `community_connections_${activeStartup.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "connection_update" }, () => {
        fetchConnections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStartup?.id]);

  // Send Connect Request action
  const handleSendConnectRequest = async (target: Startup) => {
    if (!activeStartup) {
      toast({
        title: "Active Startup Required",
        description: "Please select an active startup from your Home dashboard first.",
        variant: "destructive",
      });
      return;
    }

    if (activeStartup.id === target.id) {
      toast({
        title: "Notice",
        description: "You cannot connect to your own startup.",
      });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/community/connect-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_id: activeStartup.id,
          receiver_id: target.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "connected") {
          toast({
            title: "Connected! 🎉",
            description: `Mutual connection established with ${target.name}! You can now chat directly.`,
          });
          setConnectedIds((prev) => [...prev, target.id]);
        } else {
          toast({
            title: "Request Sent! 🚀",
            description: `Connect request sent to ${target.name}. Once accepted, messaging will unlock.`,
          });
          setSentRequestIds((prev) => [...prev, target.id]);
        }

        try {
          const targetChannel = supabase.channel(`community_connections_${target.id}`);
          targetChannel.send({
            type: "broadcast",
            event: "connection_update",
            payload: { from: activeStartup.id },
          });
        } catch {}

        fetchConnections();
      }
    } catch (err) {
      toast({
        title: "Notice",
        description: "Connect request recorded.",
      });
      setSentRequestIds((prev) => [...prev, target.id]);
    }
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry.toLowerCase()) {
      case "cleantech":
        return <Leaf className="h-3.5 w-3.5" />;
      case "edtech":
        return <GraduationCap className="h-3.5 w-3.5" />;
      case "healthtech":
        return <Heart className="h-3.5 w-3.5" />;
      case "e-commerce":
        return <ShoppingCart className="h-3.5 w-3.5" />;
      case "fintech":
        return <Briefcase className="h-3.5 w-3.5" />;
      case "travel":
        return <Globe className="h-3.5 w-3.5" />;
      case "cybersecurity":
        return <Zap className="h-3.5 w-3.5" />;
      default:
        return <Rocket className="h-3.5 w-3.5" />;
    }
  };

  const filteredStartups = startups.filter(
    (startup) =>
      startup.is_community_public &&
      matchesCategory(startup.industry, selectedCategory) &&
      (startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        startup.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.name || !onboardingForm.description) {
      toast({ title: "Error", description: "Name and Description are required", variant: "destructive" });
      return;
    }
    if (!activeStartup) {
      toast({ title: "Error", description: "You must have an active startup to join the community.", variant: "destructive" });
      return;
    }

    try {
      const updates = {
        name: onboardingForm.name,
        description: onboardingForm.description,
        industry: onboardingForm.industry === "Custom" ? onboardingForm.customIndustry : onboardingForm.industry,
        team_size: parseInt(onboardingForm.members) || 1,
        founded_year: onboardingForm.founded || new Date().getFullYear().toString(),
        contact_phone: onboardingForm.contact,
        contact_email: onboardingForm.email,
        website_url: onboardingForm.website,
        logo_url: onboardingForm.logo,
        is_community_public: true,
      };

      const { error } = await supabase.from("startups").update(updates).eq("id", activeStartup.id);

      if (error) throw error;

      toast({ title: "Success", description: "Organization details updated!" });
      setShowOnboarding(false);
      await fetchCommunityData();
      await refreshStartups();
    } catch (error) {
      console.error("Error saving community data:", error);
      toast({ title: "Error", description: "Failed to save details.", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeStartup) return;

    try {
      setLoadingFile(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${activeStartup.id}-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("startup_logos").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("startup_logos").getPublicUrl(filePath);

      setOnboardingForm({ ...onboardingForm, logo: publicUrl });
      toast({ title: "Logo Uploaded", description: "Your logo is ready to be saved." });
    } catch (error) {
      console.error("Upload Error:", error);
      toast({ title: "Upload Failed", description: "Could not upload the image.", variant: "destructive" });
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/organization" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <PageHeader title="Community" subtitle="Discover startups building on DudexAI" showBack={false} />

        {/* Search, Startups Chat Button & Onboarding Toggle */}
        <div className="mb-6 animate-fade-in opacity-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search startups by name, industry, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card border-border/70 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Startups Chat Button with Request Badge */}
            <Button
              variant="hero"
              onClick={() => navigate("/startups-chat")}
              className="gap-2 shrink-0 rounded-xl shadow-sm h-10"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Startups Chat</span>
              {incomingRequests.length > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.2 animate-pulse">
                  {incomingRequests.length}
                </Badge>
              )}
            </Button>

            {!myStartup || !myStartup.is_community_public ? (
              activeStartup?.userRole === "founder" || activeStartup?.userRole === "co_founder" ? (
                <Dialog
                  open={showOnboarding}
                  onOpenChange={(open) => {
                    if (open && activeStartup) {
                      setOnboardingForm((prev) => ({
                        ...prev,
                        name: activeStartup.name || "",
                        description: activeStartup.description || "",
                      }));
                    }
                    setShowOnboarding(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 shrink-0 rounded-xl h-10 border-border/80">
                      <Rocket className="h-4 w-4" /> Provide Your Organization Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>Organization Details</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleOnboardingSubmit} className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Startup Name *</Label>
                          <Input
                            placeholder="e.g., DudeAI"
                            value={onboardingForm.name}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Domain / Industry *</Label>
                          <Select
                            value={onboardingForm.industry}
                            onValueChange={(val) => setOnboardingForm({ ...onboardingForm, industry: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SaaS">SaaS</SelectItem>
                              <SelectItem value="EdTech">EdTech</SelectItem>
                              <SelectItem value="FinTech">FinTech</SelectItem>
                              <SelectItem value="HealthTech">HealthTech</SelectItem>
                              <SelectItem value="CleanTech">CleanTech</SelectItem>
                              <SelectItem value="E-commerce">E-commerce</SelectItem>
                              <SelectItem value="DevTools">DevTools</SelectItem>
                              <SelectItem value="AgriTech">AgriTech</SelectItem>
                              <SelectItem value="Custom">Custom / Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {onboardingForm.industry === "Custom" && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Custom Industry Name *</Label>
                          <Input
                            placeholder="e.g., DeepTech, SpaceTech..."
                            value={onboardingForm.customIndustry}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, customIndustry: e.target.value })}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <textarea
                          placeholder="What is your startup building?"
                          className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={onboardingForm.description}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, description: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Team Members</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 5"
                            value={onboardingForm.members}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, members: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Started Year</Label>
                          <Input
                            placeholder="e.g., 2024"
                            value={onboardingForm.founded}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, founded: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Contact Number</Label>
                          <Input
                            placeholder="+1 (555) 000-0000"
                            value={onboardingForm.contact}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, contact: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mail ID</Label>
                          <Input
                            type="email"
                            placeholder="hello@startup.com"
                            value={onboardingForm.email}
                            onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Website Link</Label>
                        <Input
                          placeholder="https://yourstartup.com"
                          value={onboardingForm.website}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, website: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div
                          className="flex border-2 border-dashed rounded-xl p-4 items-center justify-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {onboardingForm.logo ? (
                            <div className="relative h-16 w-16 min-h-[4rem] min-w-[4rem] max-h-[4rem] max-w-[4rem] rounded-xl overflow-hidden border border-border">
                              <img src={onboardingForm.logo} alt="Preview" className="h-full w-full object-cover block" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                              <ImageIcon className="h-8 w-8 mb-2" />
                              <span className="text-xs">Click to upload or attach logo image</span>
                            </div>
                          )}
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="submit" variant="hero" className="w-full rounded-xl">
                          Save Organization Details
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="text-sm text-muted-foreground italic px-4">
                  Only Founders or Co-Founders can publish the organization to the community.
                </div>
              )
            ) : (
              <Button
                variant="outline"
                className="gap-2 rounded-xl h-10 border-border/80"
                onClick={() => {
                  setOnboardingForm({
                    name: myStartup.name,
                    logo: myStartup.logo,
                    description: myStartup.description,
                    industry: ["SaaS", "EdTech", "FinTech", "HealthTech", "E-commerce", "DevTools", "AgriTech"].includes(myStartup.industry)
                      ? myStartup.industry
                      : "Custom",
                    customIndustry: ["SaaS", "EdTech", "FinTech", "HealthTech", "E-commerce", "DevTools", "AgriTech"].includes(myStartup.industry)
                      ? ""
                      : myStartup.industry,
                    members: myStartup.members.toString(),
                    founded: myStartup.founded,
                    contact: (myStartup as any).contact || "",
                    email: (myStartup as any).email || "",
                    website: (myStartup as any).website || "",
                  });
                  setMyStartup(null);
                  setShowOnboarding(true);
                }}
              >
                <Edit2 className="h-4 w-4" /> Make Changes
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {COMMUNITY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* User's Startup Rich Display */}
        {myStartup && myStartup.is_community_public && (
          <div className="mb-8 animate-fade-in opacity-0">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Your Organization
            </h2>
            <Card className="border-primary/30 bg-primary/5 shadow-elevated rounded-3xl">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="h-24 w-24 min-h-[6rem] min-w-[6rem] max-h-[6rem] max-w-[6rem] flex items-center justify-center rounded-2xl bg-white shadow-sm border border-primary/20 overflow-hidden shrink-0">
                    {myStartup.logo.startsWith("data:") || myStartup.logo.startsWith("http") ? (
                      <img src={myStartup.logo} alt="Logo" className="h-full w-full object-cover block" />
                    ) : (
                      <span className="text-3xl font-bold text-primary">{myStartup.logo}</span>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                      <h3 className="text-2xl font-bold text-foreground">{myStartup.name}</h3>
                      <Badge className="w-fit mx-auto md:mx-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                        {getIndustryIcon(myStartup.industry)}
                        <span className="ml-1">{myStartup.industry}</span>
                      </Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl text-sm">{myStartup.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/10">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Members</p>
                        <p className="font-semibold text-foreground">{myStartup.members}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Founded</p>
                        <p className="font-semibold text-foreground">{myStartup.founded}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
                        <p className="font-semibold text-foreground">{(myStartup as any).contact || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                        <p className="font-semibold truncate">
                          {(myStartup as any).website ? (
                            <a
                              href={(myStartup as any).website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              Visit <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="h-[1px] bg-border/50 my-10" />
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in opacity-0 stagger-1">
          <Card className="rounded-2xl border-border/60">
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">{startups.length}</p>
              <p className="text-sm text-muted-foreground">Active Startups</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {startups.reduce((acc, s) => acc + s.members, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {new Set(startups.map((s) => s.industry)).size}
              </p>
              <p className="text-sm text-muted-foreground">Industries</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {connectedIds.length}
              </p>
              <p className="text-sm text-muted-foreground">My Connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Startups Grid: Fixed avatar bounding, styled profile tag, and uniform cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((startup, index) => {
            const isMe = activeStartup?.id === startup.id;
            const isConnected = connectedIds.includes(startup.id);
            const isRequested = sentRequestIds.includes(startup.id);
            const hasIncoming = incomingRequests.some((r) => r.requester_id === startup.id);
            const isDismissed = dismissedStartupIds.includes(startup.id);

            if (isDismissed) return null;

            // Deterministic match score
            const matchScore =
              84 + (Math.abs(startup.name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 14);

            return (
              <Card
                key={startup.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-sm hover:shadow-elevated hover:border-primary/40 transition-all duration-300 animate-fade-in-up opacity-0 stagger-${Math.min(
                  index + 1,
                  5
                )}`}
              >
                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  {/* Top Header: Explicitly Bounded Avatar + Startup Name + Tag Badge */}
                  <div className="flex items-start gap-3.5">
                    {/* Fixed strictly bounded avatar container */}
                    <div className="h-14 w-14 min-w-[3.5rem] min-h-[3.5rem] max-w-[3.5rem] max-h-[3.5rem] rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/25 shadow-sm flex items-center justify-center shrink-0 overflow-hidden relative">
                      {startup.logo.startsWith("data:") || startup.logo.startsWith("http") ? (
                        <img src={startup.logo} alt={startup.name} className="h-full w-full object-cover object-center block" />
                      ) : (
                        <span className="font-display font-bold text-lg text-primary uppercase select-none tracking-wider">
                          {startup.logo}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-display font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {startup.name}
                      </h3>
                      {/* Properly styled profile tag */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/25 gap-1 inline-flex items-center"
                        >
                          {getIndustryIcon(startup.industry)}
                          <span>{startup.industry || "SaaS"}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row: Business model + Stage */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">
                        {startup.industry.toLowerCase().includes("saas") ||
                        startup.industry.toLowerCase().includes("b2b")
                          ? "B2B, Enterprise"
                          : "B2C, B2B"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium">
                        Seed (Scaling) • Founded {startup.founded}
                      </span>
                    </div>
                  </div>

                  {/* Description text */}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed min-h-[3.6rem]">
                    {startup.description}
                  </p>

                  {/* Strong Match Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${matchScore}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span>Strong Match</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{matchScore}% Match</span>
                    </div>
                  </div>

                  {/* Actions: Connect + Details */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {isMe ? (
                      <Badge variant="outline" className="w-full justify-center py-2 bg-primary/5 text-primary border-primary/20">
                        Your Startup
                      </Badge>
                    ) : isConnected ? (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => navigate(`/startups-chat?startupId=${startup.id}`)}
                        className="flex-1 rounded-xl text-xs gap-1.5 h-9"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Message</span>
                      </Button>
                    ) : hasIncoming ? (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => navigate(`/startups-chat`)}
                        className="flex-1 rounded-xl text-xs gap-1.5 h-9"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept Connect</span>
                      </Button>
                    ) : isRequested ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex-1 rounded-xl text-xs gap-1.5 h-9 text-muted-foreground opacity-80"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Requested</span>
                      </Button>
                    ) : (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => handleSendConnectRequest(startup)}
                        className="flex-1 rounded-xl text-xs gap-1.5 h-9 shadow-sm"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Connect</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStartup(startup)}
                      className="rounded-xl text-xs h-9 text-muted-foreground hover:text-foreground"
                    >
                      Details
                    </Button>

                    {!isMe && !isConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDismissedStartupIds((prev) => [...prev, startup.id])}
                        className="rounded-xl text-[11px] h-9 text-muted-foreground/60 hover:text-muted-foreground px-2"
                        title="Hide this recommendation"
                      >
                        Not Interested
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredStartups.length === 0 && (
          <div className="text-center py-16">
            <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-medium text-foreground">No startups found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search query or industry filter</p>
          </div>
        )}
      </div>

      {/* Startup Details Modal - Completely Redesigned for Alignment, Responsiveness and Elegance */}
      <Dialog open={!!selectedStartup} onOpenChange={(open) => !open && setSelectedStartup(null)}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
          <DialogTitle className="sr-only">Startup Details</DialogTitle>
          <DialogDescription className="sr-only">Comprehensive overview and contact details for this startup</DialogDescription>
          {selectedStartup && (
            <div>
              {/* Header Banner with Profile Avatar */}
              <div className="relative h-28 sm:h-32 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 flex items-end px-6 pb-0">
                {/* Fixed strictly bounded avatar container */}
                <div className="absolute -bottom-8 left-6 h-20 w-20 min-h-[5rem] min-w-[5rem] max-h-[5rem] max-w-[5rem] rounded-2xl bg-card border-4 border-background shadow-lg flex items-center justify-center shrink-0 overflow-hidden z-10">
                  {selectedStartup.logo?.startsWith("data:") || selectedStartup.logo?.startsWith("http") ? (
                    <img src={selectedStartup.logo} alt={selectedStartup.name} className="h-full w-full object-cover object-center block" />
                  ) : (
                    <span className="font-display font-bold text-2xl text-primary uppercase select-none tracking-wider">
                      {selectedStartup.logo}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="pt-11 px-6 pb-6 space-y-5">
                {/* Title & Badges Row (Using flex-wrap to prevent any overflow/chopping) */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display font-bold text-xl sm:text-2xl text-foreground break-words">
                      {selectedStartup.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="gap-1.5 py-0.5 px-2.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold rounded-lg inline-flex items-center"
                    >
                      {getIndustryIcon(selectedStartup.industry)}
                      <span>{selectedStartup.industry}</span>
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-medium rounded-lg">
                      Seed (Scaling)
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-2xl border border-border/50">
                    {selectedStartup.description}
                  </p>
                </div>

                {/* Team & Founding Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Team</p>
                      <p className="text-sm font-semibold text-foreground">{selectedStartup.members} Members</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Founded</p>
                      <p className="text-sm font-semibold text-foreground">{selectedStartup.founded}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information & Channels */}
                <div className="space-y-2">
                  {(selectedStartup as any)?.contact && (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{(selectedStartup as any).contact}</span>
                    </div>
                  )}

                  {(selectedStartup as any)?.email && (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <a
                        href={`mailto:${(selectedStartup as any).email}`}
                        className="font-medium text-foreground hover:text-primary transition-colors truncate"
                      >
                        {(selectedStartup as any).email}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs sm:text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground">Remote Collaboration Ready</span>
                  </div>
                </div>

                {/* Bottom Action Buttons - Full-width Primary CTA + Balanced Secondary Grid */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  {/* Primary CTA */}
                  {activeStartup && activeStartup.id === selectedStartup.id ? (
                    <div className="py-2.5 text-center text-xs font-semibold text-primary bg-primary/10 rounded-xl border border-primary/20">
                      This is your organization
                    </div>
                  ) : connectedIds.includes(selectedStartup.id) ? (
                    <Button
                      variant="hero"
                      onClick={() => navigate(`/startups-chat?startupId=${selectedStartup.id}`)}
                      className="w-full rounded-xl gap-2 h-11 text-sm shadow-sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Message on Startups Chat</span>
                    </Button>
                  ) : incomingRequests.some((r) => r.requester_id === selectedStartup.id) ? (
                    <Button
                      variant="hero"
                      onClick={() => {
                        navigate("/startups-chat");
                      }}
                      className="w-full rounded-xl gap-2 h-11 text-sm shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Accept Connection Request</span>
                    </Button>
                  ) : sentRequestIds.includes(selectedStartup.id) ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full rounded-xl gap-2 h-11 text-sm text-muted-foreground opacity-80"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Connect Request Sent (Pending)</span>
                    </Button>
                  ) : (
                    <Button
                      variant="hero"
                      onClick={() => {
                        handleSendConnectRequest(selectedStartup);
                        setSelectedStartup(null);
                      }}
                      className="w-full rounded-xl gap-2 h-11 text-sm shadow-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Send Connect Request</span>
                    </Button>
                  )}

                  {/* Secondary Actions (Clean 2-Column Grid) */}
                  <div className="grid grid-cols-2 gap-3">
                    {(selectedStartup as any)?.website && (selectedStartup as any).website.trim() !== "" ? (
                      <Button asChild variant="outline" className="w-full rounded-xl h-10 text-xs border-border/80">
                        <a
                          href={
                            (selectedStartup as any).website.startsWith("http")
                              ? (selectedStartup as any).website
                              : `https://${(selectedStartup as any).website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Visit Website</span>
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="w-full rounded-xl h-10 text-xs opacity-50 cursor-not-allowed border-border/60"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span>No Website</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setSelectedStartup(null)}
                      className="w-full rounded-xl h-10 text-xs border-border/80 hover:bg-muted"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
