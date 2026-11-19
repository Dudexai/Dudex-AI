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
  Send,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { useState, useRef } from "react";
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
import { useEffect } from "react";

interface Startup {
  id: string;
  name: string;
  logo: string;
  description: string;
  industry: string;
  members: number;
  founded: string;
  is_community_public: boolean;
}

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
  "Custom / Hybrid"
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
      return ind.includes("custom") || ind.includes("hybrid") || ind.includes("other") || ind.includes("agri") ||
             !["saas", "edtech", "fintech", "healthtech", "cleantech", "e-commerce", "ecommerce", "ai", "hardware", "mobility"].some(k => ind.includes(k));
    default:
      return ind.includes(category.toLowerCase());
  }
};

const Community = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup, refreshStartups } = useStartup();
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [myStartup, setMyStartup] = useState<Startup | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Community Chat & Filter States
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeChatStartup, setActiveChatStartup] = useState<Startup | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getStorageKey = (id1: string, id2: string) => {
    const pair = [id1, id2].sort().join("_");
    return `dudex_community_chat_${pair}`;
  };

  const loadChatMessages = async (targetStartup: Startup) => {
    if (!activeStartup) return;
    const pairKey = getStorageKey(activeStartup.id, targetStartup.id);
    
    // First read from local cache
    try {
      const local = localStorage.getItem(pairKey);
      if (local) {
        setChatMessages(JSON.parse(local));
      } else {
        setChatMessages([]);
      }
    } catch {}

    // Next try reading from Supabase community_messages
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .or(`and(sender_startup_id.eq.${activeStartup.id},receiver_startup_id.eq.${targetStartup.id}),and(sender_startup_id.eq.${targetStartup.id},receiver_startup_id.eq.${activeStartup.id})`)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setChatMessages(data);
        localStorage.setItem(pairKey, JSON.stringify(data));
      }
    } catch (err) {
      console.warn("community_messages remote fetch notice:", err);
    }
  };

  const openChatWith = (targetStartup: Startup) => {
    if (!activeStartup) {
      toast({
        title: "Active Startup Required",
        description: "Please create or select an active startup first to message other community startups.",
        variant: "destructive"
      });
      return;
    }
    if (activeStartup.id === targetStartup.id) {
      toast({
        title: "Notice",
        description: "You cannot message your own startup.",
      });
      return;
    }
    setSelectedStartup(null);
    setActiveChatStartup(targetStartup);
    setChatOpen(true);
    loadChatMessages(targetStartup);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeStartup || !activeChatStartup || sendingMessage) return;

    setSendingMessage(true);
    const msgObj = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender_startup_id: activeStartup.id,
      sender_startup_name: activeStartup.name,
      receiver_startup_id: activeChatStartup.id,
      receiver_startup_name: activeChatStartup.name,
      sender_user_id: user?.id,
      sender_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Founder",
      message: newMessage.trim(),
      created_at: new Date().toISOString()
    };

    const updated = [...chatMessages, msgObj];
    setChatMessages(updated);
    setNewMessage("");

    const pairKey = getStorageKey(activeStartup.id, activeChatStartup.id);
    try {
      localStorage.setItem(pairKey, JSON.stringify(updated));
    } catch {}

    // Broadcast in real-time over Supabase WebSocket channel
    try {
      const channelName = `community_chat_${pairKey}`;
      const channel = supabase.channel(channelName);
      channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: msgObj
      });
    } catch (bcErr) {
      console.warn("Realtime broadcast notice:", bcErr);
    }

    try {
      await supabase.from('community_messages').insert(msgObj);
    } catch (dbErr) {
      console.warn("community_messages remote insert notice:", dbErr);
    } finally {
      setSendingMessage(false);
    }
  };

  // Real-time listener for incoming messages + Polling fallback
  useEffect(() => {
    if (!chatOpen || !activeStartup || !activeChatStartup) return;

    const pairKey = getStorageKey(activeStartup.id, activeChatStartup.id);
    const channelName = `community_chat_${pairKey}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.id) {
          setChatMessages((prev) => {
            if (prev.some(m => m.id === payload.id)) return prev;
            const updated = [...prev, payload];
            try { localStorage.setItem(pairKey, JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages'
      }, (payload) => {
        const newMsg = payload.new as any;
        if (
          newMsg &&
          ((newMsg.sender_startup_id === activeStartup.id && newMsg.receiver_startup_id === activeChatStartup.id) ||
           (newMsg.sender_startup_id === activeChatStartup.id && newMsg.receiver_startup_id === activeStartup.id))
        ) {
          setChatMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            try { localStorage.setItem(pairKey, JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      })
      .subscribe();

    // 3-second auto-sync fallback
    const syncInterval = setInterval(() => {
      loadChatMessages(activeChatStartup);
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
  }, [chatOpen, activeStartup?.id, activeChatStartup?.id]);

  useEffect(() => {
    if (chatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

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
    customIndustry: ""
  });

  useEffect(() => {
    fetchCommunityData();
  }, [user, activeStartup]);

  const fetchCommunityData = async () => {
    try {
      const { data, error } = await supabase
        .from('startups')
        .select('*');

      if (error) throw error;
      
      const rawData = data as any[];
      const mappedStartups: Startup[] = rawData.filter(s => s.name).map(s => ({
        id: s.id,
        name: s.name || 'Unnamed',
        logo: s.logo_url || s.name?.substring(0, 2).toUpperCase() || 'ST',
        description: s.description || 'No description provided.',
        industry: s.industry || 'Other',
        members: s.team_size || 1,
        founded: s.founded_year || new Date().getFullYear().toString(),
        contact: s.contact_phone || '',
        email: s.contact_email || '',
        website: s.website_url || '',
        is_community_public: s.is_community_public || false
      }));
      setStartups(mappedStartups);

      if (activeStartup) {
        const mine = mappedStartups.find(s => s.id === activeStartup.id);
        if (mine) setMyStartup(mine);
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
    }
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry.toLowerCase()) {
      case "cleantech":
        return <Leaf className="h-4 w-4" />;
      case "edtech":
        return <GraduationCap className="h-4 w-4" />;
      case "healthtech":
        return <Heart className="h-4 w-4" />;
      case "e-commerce":
        return <ShoppingCart className="h-4 w-4" />;
      case "fintech":
        return <Briefcase className="h-4 w-4" />;
      case "travel":
        return <Globe className="h-4 w-4" />;
      case "cybersecurity":
        return <Zap className="h-4 w-4" />;
      default:
        return <Rocket className="h-4 w-4" />;
    }
  };

  const filteredStartups = startups.filter(startup =>
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
        logo_url: onboardingForm.logo, // Could be a public Supabase URL now
        is_community_public: true
      };

      const { error } = await supabase
        .from('startups')
        .update(updates)
        .eq('id', activeStartup.id);

      if (error) throw error;

      toast({ title: "Success", description: "Organization details updated!" });
      setShowOnboarding(false);
      await fetchCommunityData(); // Refresh list to get updated data
      await refreshStartups(); // Refresh global context so dashboard updates
    } catch (error) {
      console.error('Error saving community data:', error);
      toast({ title: "Error", description: "Failed to save details.", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeStartup) return;

    try {
      setLoadingFile(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${activeStartup.id}-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('startup_logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('startup_logos')
        .getPublicUrl(filePath);

      setOnboardingForm({ ...onboardingForm, logo: publicUrl });
      toast({ title: "Logo Uploaded", description: "Your logo is ready to be saved." });
    } catch (error) {
      console.error('Upload Error:', error);
      toast({ title: "Upload Failed", description: "Could not upload the image.", variant: "destructive" });
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/organization" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Community"
          subtitle="Discover startups building on DudexAI"
          showBack={false}
        />

        {/* Search, Chat Access & Onboarding Toggle */}
        <div className="mb-4 animate-fade-in opacity-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search startups by name, industry, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setInboxOpen(true)}
              className="gap-2 shrink-0 border-primary/20 hover:border-primary/40 text-primary rounded-xl"
            >
              <MessageSquare className="h-4 w-4" /> My Chats & Connections
            </Button>

          {(!myStartup || !myStartup.is_community_public) ? (
            (activeStartup?.userRole === "founder" || activeStartup?.userRole === "co_founder") ? (
              <Dialog open={showOnboarding} onOpenChange={(open) => {
                if (open && activeStartup) {
                  setOnboardingForm(prev => ({
                    ...prev,
                    name: activeStartup.name || "",
                    description: activeStartup.description || ""
                  }));
                }
                setShowOnboarding(open);
              }}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2 shrink-0">
                    <Rocket className="h-4 w-4" /> Provide Your Organization Details
                  </Button>
                </DialogTrigger>
              <DialogContent aria-describedby={undefined} className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                    <div className="flex border-2 border-dashed rounded-xl p-4 items-center justify-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {onboardingForm.logo ? (
                        <div className="relative h-16 w-16">
                          <img src={onboardingForm.logo} alt="Preview" className="h-full w-full object-cover rounded-lg" />
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
                    <Button type="submit" variant="hero" className="w-full">Save Organization Details</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            ) : (
                <div className="text-sm text-muted-foreground italic px-4">
                  Only Founders or Co-Founders can initially publish the organization to the community.
                </div>
            )
          ) : (
            <Button variant="outline" className="gap-2" onClick={() => {
              setOnboardingForm({
                name: myStartup.name,
                logo: myStartup.logo,
                description: myStartup.description,
                industry: ["SaaS", "EdTech", "FinTech", "HealthTech", "E-commerce", "DevTools", "AgriTech"].includes(myStartup.industry) ? myStartup.industry : "Custom",
                customIndustry: ["SaaS", "EdTech", "FinTech", "HealthTech", "E-commerce", "DevTools", "AgriTech"].includes(myStartup.industry) ? "" : myStartup.industry,
                members: myStartup.members.toString(),
                founded: myStartup.founded,
                contact: (myStartup as any).contact || "",
                email: (myStartup as any).email || "",
                website: (myStartup as any).website || "",
              });
              setMyStartup(null); // Simple way to reopen the form for "Make Changes"
              setShowOnboarding(true);
            }}>
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
        {(myStartup && myStartup.is_community_public) && (
          <div className="mb-8 animate-fade-in opacity-0">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Your Organization
            </h2>
            <Card className="border-primary/30 bg-primary/5 shadow-elevated">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="h-24 w-24 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-primary/10 overflow-hidden shrink-0">
                    {(myStartup.logo.startsWith('data:') || myStartup.logo.startsWith('http')) ? (
                      <img src={myStartup.logo} alt="Logo" className="h-full w-full object-contain p-2" />
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
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">{myStartup.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/10">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Members</p>
                        <p className="font-semibold">{myStartup.members}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Founded</p>
                        <p className="font-semibold">{myStartup.founded}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
                        <p className="font-semibold">{(myStartup as any).contact || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                        <p className="font-semibold truncate">
                          {(myStartup as any).website ? (
                            <a href={(myStartup as any).website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              Visit <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : "N/A"}
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
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">{startups.length}</p>
              <p className="text-sm text-muted-foreground">Active Startups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {startups.reduce((acc, s) => acc + s.members, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {new Set(startups.map(s => s.industry)).size}
              </p>
              <p className="text-sm text-muted-foreground">Industries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {startups.filter(s => s.founded === "2024").length}
              </p>
              <p className="text-sm text-muted-foreground">Founded in 2024</p>
            </CardContent>
          </Card>
        </div>

        {/* Startups List */}
        <div className="space-y-3">
          {filteredStartups.map((startup, index) => (
            <Card
              key={startup.id}
              onClick={() => setSelectedStartup(startup)}
              className={`animate-fade-in-up opacity-0 stagger-${Math.min(index + 1, 5)} hover:shadow-elevated transition-shadow cursor-pointer border-border/50`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary shrink-0 overflow-hidden">
                    {(startup.logo.startsWith('data:') || startup.logo.startsWith('http')) ? (
                      <img src={startup.logo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      startup.logo
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-foreground">
                        {startup.name}
                      </h3>
                      <Badge variant="outline" className="gap-1">
                        {getIndustryIcon(startup.industry)}
                        {startup.industry}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {startup.description}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="font-medium text-foreground">{startup.members}</p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{startup.founded}</p>
                      <p className="text-xs text-muted-foreground">Founded</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStartups.length === 0 && (
          <div className="text-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-medium text-foreground">No startups found</h3>
            <p className="text-muted-foreground">Try adjusting your search query</p>
          </div>
        )}
      </div>

      {/* Startup Details Modal */}
      <Dialog open={!!selectedStartup} onOpenChange={(open) => !open && setSelectedStartup(null)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogTitle className="sr-only">Startup Details</DialogTitle>
          <DialogDescription className="sr-only">Startup information and contact</DialogDescription>
          {selectedStartup && (
            <>
              <div className="relative h-32 w-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-end px-6 pb-4">
                <div className="absolute -bottom-10 left-6 h-20 w-20 rounded-2xl bg-white shadow-lg border border-border flex items-center justify-center overflow-hidden">
                  {(selectedStartup.logo?.startsWith('data:') || selectedStartup.logo?.startsWith('http')) ? (
                    <img src={selectedStartup.logo} alt="Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{selectedStartup.logo}</span>
                  )}
                </div>
              </div>

              <div className="pt-12 px-6 pb-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{selectedStartup.name}</h2>
                    <Badge variant="outline" className="gap-1 bg-muted/30">
                      {getIndustryIcon(selectedStartup.industry)}
                      {selectedStartup.industry}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedStartup.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Users2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Team</p>
                      <p className="text-sm font-semibold">{selectedStartup.members} Members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Founded</p>
                      <p className="text-sm font-semibold">{selectedStartup.founded}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {(selectedStartup as any)?.contact && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <Phone className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{(selectedStartup as any).contact}</p>
                    </div>
                  )}
                  {(selectedStartup as any)?.email && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <Mail className="h-4 w-4 text-primary" />
                      <a href={`mailto:${(selectedStartup as any).email}`} className="text-sm font-medium hover:text-primary transition-colors">
                        {(selectedStartup as any).email}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Remote Options Available</p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  {activeStartup && activeStartup.id !== selectedStartup.id && (
                    <Button 
                      variant="hero" 
                      onClick={() => openChatWith(selectedStartup)}
                      className="flex-1 rounded-xl gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Connect & Chat
                    </Button>
                  )}
                  {((selectedStartup as any)?.website && (selectedStartup as any).website !== "https://example.com" && (selectedStartup as any).website.trim() !== "") ? (
                    <Button asChild variant="outline" className="flex-1 rounded-xl">
                      <a 
                        href={(selectedStartup as any).website.startsWith('http') ? (selectedStartup as any).website : `https://${(selectedStartup as any).website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      disabled 
                      className="flex-1 rounded-xl opacity-60 cursor-not-allowed text-muted-foreground"
                      title="This startup has not listed a public website URL yet."
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      No Website Listed
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setSelectedStartup(null)} className="rounded-xl">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Community Startup-to-Startup Direct Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[550px] h-[650px] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl shadow-2xl border-border">
          <DialogTitle className="sr-only">Chat with {activeChatStartup?.name || "Startup"}</DialogTitle>
          <DialogDescription className="sr-only">Direct messaging channel</DialogDescription>
          {activeChatStartup && (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-border flex items-center justify-center font-bold text-primary overflow-hidden">
                    {(activeChatStartup.logo?.startsWith('data:') || activeChatStartup.logo?.startsWith('http')) ? (
                      <img src={activeChatStartup.logo} alt="Logo" className="h-full w-full object-contain p-1" />
                    ) : (
                      activeChatStartup.logo
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground leading-tight">{activeChatStartup.name}</h3>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/5 text-primary border-primary/20">
                        {activeChatStartup.industry}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Direct connection: <span className="font-semibold text-foreground">{activeStartup?.name}</span> &amp; <span className="font-semibold text-foreground">{activeChatStartup.name}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-muted/20">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 text-primary/30 mb-3" />
                    <p className="font-semibold text-foreground text-sm">Start a conversation with {activeChatStartup.name}</p>
                    <p className="text-xs max-w-xs mt-1">
                      Exchange ideas, discuss partnerships, or explore co-marketing opportunities directly with their founding team.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isMe = msg.sender_startup_id === activeStartup?.id;
                    return (
                      <div key={msg.id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-muted-foreground mb-1 px-1">
                          {isMe ? `${msg.sender_name} (You)` : `${msg.sender_name} (${activeChatStartup.name})`}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted border border-border/60 text-foreground rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground/70 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <form onSubmit={sendMessage} className="p-3 border-t border-border bg-background flex items-center gap-2">
                <Input
                  placeholder={`Write a message to ${activeChatStartup.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-xl"
                  autoFocus
                />
                <Button type="submit" variant="hero" disabled={!newMessage.trim() || sendingMessage} className="rounded-xl px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Connections Inbox Dialog */}
      <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[450px] max-h-[85vh] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Community Connections &amp; Chats
            </DialogTitle>
            <DialogDescription className="sr-only">Recent community messages</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Conversations between your startup (<span className="font-semibold text-foreground">{activeStartup?.name || "Your Startup"}</span>) and other community founders:
            </p>
            {startups.filter(s => s.id !== activeStartup?.id).length === 0 ? (
              <p className="text-sm text-center py-6 text-muted-foreground">No other startups available yet.</p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {startups.filter(s => s.id !== activeStartup?.id).map((other) => {
                  const pairKey = activeStartup ? getStorageKey(activeStartup.id, other.id) : "";
                  const local = pairKey ? localStorage.getItem(pairKey) : null;
                  const msgs = local ? JSON.parse(local) : [];
                  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                  return (
                    <div
                      key={other.id}
                      onClick={() => {
                        setInboxOpen(false);
                        openChatWith(other);
                      }}
                      className="p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                          {(other.logo?.startsWith('data:') || other.logo?.startsWith('http')) ? (
                            <img src={other.logo} alt="Logo" className="h-full w-full object-contain p-1" />
                          ) : (
                            other.logo
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{other.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMsg ? lastMsg.message : other.industry}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0 text-primary">
                        Chat
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
