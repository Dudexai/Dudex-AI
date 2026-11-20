import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Users2,
  Search,
  MessageSquare,
  MessageCircle,
  Send,
  UserPlus,
  Check,
  X,
  Clock,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Building,
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";
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
  is_community_public?: boolean;
}

interface IncomingRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender_startup_id: string;
  receiver_startup_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const StartupsChat = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup } = useStartup();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetStartupIdParam = searchParams.get("startupId");

  const [allStartups, setAllStartups] = useState<Startup[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [profileModalStartup, setProfileModalStartup] = useState<Startup | null>(null);

  // Requests Drawer / Sheet
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper for localStorage pair key
  const getStorageKey = (id1: string, id2: string) => {
    const pair = [id1, id2].sort().join("_");
    return `dudex_community_chat_${pair}`;
  };

  // 1. Fetch all community startups from Supabase
  const fetchAllStartups = async () => {
    try {
      const { data, error } = await supabase.from("startups").select("*");
      if (!error && data) {
        const mapped: Startup[] = (data as any[])
          .filter((s) => s.name)
          .map((s) => ({
            id: s.id,
            name: s.name || "Unnamed",
            logo: s.logo_url || s.name?.substring(0, 2).toUpperCase() || "ST",
            description: s.description || "No description provided.",
            industry: s.industry || "SaaS",
            members: s.team_size || 1,
            founded: s.founded_year || new Date().getFullYear().toString(),
            contact: s.contact_phone || "",
            email: s.contact_email || "",
            website: s.website_url || "",
            is_community_public: s.is_community_public || false,
          }));
        setAllStartups(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch startups:", err);
    }
  };

  // 2. Fetch connections & requests from backend
  const fetchConnections = async () => {
    if (!activeStartup) return;

    try {
      const res = await fetch(`${BACKEND_URL}/community/connections?startup_id=${activeStartup.id}`);
      if (res.ok) {
        const data = await res.json();
        setConnectedIds(data.connected_ids || []);
        setIncomingRequests(data.incoming_requests || []);

        // Also update local cache for instant load
        localStorage.setItem(`dudex_connected_ids_${activeStartup.id}`, JSON.stringify(data.connected_ids || []));
        localStorage.setItem(`dudex_incoming_requests_${activeStartup.id}`, JSON.stringify(data.incoming_requests || []));
      }
    } catch (err) {
      // Fallback to local storage if backend is temporarily unreachable
      try {
        const cachedConn = localStorage.getItem(`dudex_connected_ids_${activeStartup.id}`);
        if (cachedConn) setConnectedIds(JSON.parse(cachedConn));
        const cachedReq = localStorage.getItem(`dudex_incoming_requests_${activeStartup.id}`);
        if (cachedReq) setIncomingRequests(JSON.parse(cachedReq));
      } catch {}
    }
  };

  useEffect(() => {
    fetchAllStartups();
  }, []);

  useEffect(() => {
    if (activeStartup) {
      fetchConnections();
    }
  }, [activeStartup?.id]);

  // Handle URL param ?startupId=...
  useEffect(() => {
    if (targetStartupIdParam && allStartups.length > 0) {
      const match = allStartups.find((s) => s.id === targetStartupIdParam);
      if (match) {
        setSelectedStartup(match);
      }
    }
  }, [targetStartupIdParam, allStartups]);

  // Load chat messages when a startup is selected
  const loadMessages = async (target: Startup) => {
    if (!activeStartup) return;
    const pairKey = getStorageKey(activeStartup.id, target.id);

    // Read from local cache first
    try {
      const local = localStorage.getItem(pairKey);
      if (local) {
        setMessages(JSON.parse(local));
      } else {
        setMessages([]);
      }
    } catch {}

    // Fetch from backend
    try {
      const res = await fetch(
        `${BACKEND_URL}/community/messages?startup1_id=${activeStartup.id}&startup2_id=${target.id}`
      );
      if (res.ok) {
        const remoteMsgs: ChatMessage[] = await res.json();
        if (remoteMsgs && remoteMsgs.length > 0) {
          setMessages(remoteMsgs);
          localStorage.setItem(pairKey, JSON.stringify(remoteMsgs));
        }
      }
    } catch (err) {
      console.warn("Backend messages fetch warning:", err);
    }
  };

  useEffect(() => {
    if (selectedStartup) {
      loadMessages(selectedStartup);
    }
  }, [selectedStartup?.id, activeStartup?.id]);

  // Real-time listener for incoming messages & connection events
  useEffect(() => {
    if (!activeStartup) return;

    // Real-time channel for connections
    const connChannelName = `community_connections_${activeStartup.id}`;
    const connChannel = supabase.channel(connChannelName);

    connChannel
      .on("broadcast", { event: "connection_update" }, () => {
        fetchConnections();
      })
      .subscribe();

    // Real-time channel for chat messages if a conversation is open
    let chatChannel: any = null;
    if (selectedStartup) {
      const pairKey = getStorageKey(activeStartup.id, selectedStartup.id);
      const chatChannelName = `community_chat_${pairKey}`;
      chatChannel = supabase.channel(chatChannelName);

      chatChannel
        .on("broadcast", { event: "new_message" }, ({ payload }: { payload: ChatMessage }) => {
          if (payload && payload.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              const next = [...prev, payload];
              try {
                localStorage.setItem(pairKey, JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        })
        .subscribe();
    }

    // Auto-refresh interval (5s)
    const interval = setInterval(() => {
      fetchConnections();
      if (selectedStartup) {
        loadMessages(selectedStartup);
      }
    }, 4000);

    return () => {
      supabase.removeChannel(connChannel);
      if (chatChannel) supabase.removeChannel(chatChannel);
      clearInterval(interval);
    };
  }, [activeStartup?.id, selectedStartup?.id]);

  // Auto-scroll on messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Action: Accept Connection Request
  const handleAcceptRequest = async (request: IncomingRequest) => {
    if (!activeStartup) return;
    setProcessingAction(request.id);

    try {
      const res = await fetch(`${BACKEND_URL}/community/accept-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          startup_id: activeStartup.id,
        }),
      });

      if (res.ok) {
        const requesterStartup = allStartups.find((s) => s.id === request.requester_id);
        toast({
          title: "Connection Accepted! 🎉",
          description: `You and ${requesterStartup?.name || "the startup"} are now connected. You can message each other directly!`,
        });

        // Broadcast to requester
        try {
          const reqChannel = supabase.channel(`community_connections_${request.requester_id}`);
          reqChannel.send({
            type: "broadcast",
            event: "connection_update",
            payload: { accepted_by: activeStartup.id },
          });
        } catch {}

        await fetchConnections();

        // If user wants to immediately start chatting
        if (requesterStartup) {
          setSelectedStartup(requesterStartup);
          setRequestsOpen(false);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to accept connection request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Network error accepting connection.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Reject Connection Request
  const handleRejectRequest = async (request: IncomingRequest) => {
    if (!activeStartup) return;
    setProcessingAction(request.id);

    try {
      const res = await fetch(`${BACKEND_URL}/community/reject-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          startup_id: activeStartup.id,
        }),
      });

      if (res.ok) {
        toast({
          title: "Request Declined",
          description: "The connection request was dismissed.",
        });
        await fetchConnections();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Network error dismissing request.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeStartup || !selectedStartup || sendingMessage) return;

    setSendingMessage(true);
    const content = inputText.trim();
    setInputText("");

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender_startup_id: activeStartup.id,
      receiver_startup_id: selectedStartup.id,
      sender_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Founder",
      message: content,
      created_at: new Date().toISOString(),
    };

    // Optimistic UI update
    const updated = [...messages, newMsg];
    setMessages(updated);

    const pairKey = getStorageKey(activeStartup.id, selectedStartup.id);
    try {
      localStorage.setItem(pairKey, JSON.stringify(updated));
    } catch {}

    // Broadcast over Supabase channel
    try {
      const chatChannel = supabase.channel(`community_chat_${pairKey}`);
      chatChannel.send({
        type: "broadcast",
        event: "new_message",
        payload: newMsg,
      });
    } catch (bcErr) {
      console.warn("Realtime broadcast note:", bcErr);
    }

    // Persist to backend database
    try {
      await fetch(`${BACKEND_URL}/community/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_startup_id: activeStartup.id,
          receiver_startup_id: selectedStartup.id,
          sender_name: newMsg.sender_name,
          message: content,
        }),
      });
    } catch (err) {
      console.warn("Backend save message error:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter connected startups
  const connectedStartups = allStartups.filter(
    (s) =>
      s.id !== activeStartup?.id &&
      connectedIds.includes(s.id) &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/community" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Page Header with Requests Notification Icon */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Startups Chat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Direct collaborative messaging channel between mutually connected startup teams
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Top Request Button / Notification Icon */}
            <Button
              variant={incomingRequests.length > 0 ? "hero" : "outline"}
              onClick={() => setRequestsOpen(true)}
              className="relative gap-2 rounded-xl border-primary/20 shadow-sm transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Connection Requests</span>
              {incomingRequests.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground px-1.5 animate-pulse">
                  {incomingRequests.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/community")}
              className="gap-2 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
            >
              <Users2 className="h-4 w-4" />
              Browse Community
            </Button>
          </div>
        </div>

        {/* Notice if no active startup */}
        {!activeStartup && (
          <Card className="mb-6 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl">
            <CardContent className="py-4 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm">
              <Info className="h-5 w-5 shrink-0" />
              <span>
                Please select or create an active startup from your Home dashboard to connect and message other startup founders.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Main Dual-Pane Chat Layout */}
        <div className="bg-background/80 backdrop-blur-md rounded-3xl border border-border/60 shadow-elevated overflow-hidden min-h-[650px] flex flex-col md:flex-row">
          {/* Left Column: Connected Startups List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border/60 flex flex-col ${
              selectedStartup ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search Header */}
            <div className="p-4 border-b border-border/50 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Connected Startups ({connectedStartups.length})
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  Mutual Connect
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search connected startups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Startups Conversation Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {connectedStartups.length === 0 ? (
                <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center h-full">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <UserPlus className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">No Connected Startups Yet</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                      Just like Instagram mutual follow, when both startups send or accept a connect request, the message button appears here!
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => navigate("/community")}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <span>Discover Startups</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                connectedStartups.map((other) => {
                  const isSelected = selectedStartup?.id === other.id;
                  const pairKey = activeStartup ? getStorageKey(activeStartup.id, other.id) : "";
                  const local = pairKey ? localStorage.getItem(pairKey) : null;
                  const cachedMsgs = local ? JSON.parse(local) : [];
                  const lastMsg = cachedMsgs.length > 0 ? cachedMsgs[cachedMsgs.length - 1] : null;

                  return (
                    <button
                      key={other.id}
                      onClick={() => setSelectedStartup(other)}
                      className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="relative h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] max-h-[2.75rem] max-w-[2.75rem] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden shadow-sm">
                        {other.logo?.startsWith("data:") || other.logo?.startsWith("http") ? (
                          <img src={other.logo} alt="Logo" className="h-full w-full object-cover object-center block" />
                        ) : (
                          <span className="font-bold text-sm uppercase">{other.logo}</span>
                        )}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-sm text-foreground truncate">{other.name}</h4>
                          {lastMsg && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(lastMsg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lastMsg ? lastMsg.message : `Industry: ${other.industry}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className={`flex-1 flex flex-col ${!selectedStartup ? "hidden md:flex" : "flex"}`}>
            {selectedStartup ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedStartup(null)}
                      className="md:hidden h-8 w-8 rounded-lg"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="h-10 w-10 min-h-[2.5rem] min-w-[2.5rem] max-h-[2.5rem] max-w-[2.5rem] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden shrink-0 shadow-sm">
                      {selectedStartup.logo?.startsWith("data:") || selectedStartup.logo?.startsWith("http") ? (
                        <img src={selectedStartup.logo} alt={selectedStartup.name} className="h-full w-full object-cover object-center block" />
                      ) : (
                        <span className="font-bold text-sm uppercase">{selectedStartup.logo}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground leading-tight text-base">{selectedStartup.name}</h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-2 bg-primary/5 text-primary border-primary/20"
                        >
                          {selectedStartup.industry}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                        </span>
                        <span>•</span>
                        <span>{selectedStartup.members} team members</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileModalStartup(selectedStartup)}
                      className="text-xs rounded-xl h-8 gap-1.5 border-border/80"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Startup Info</span>
                    </Button>
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-background to-muted/10">
                  {messages.length === 0 ? (
                    <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <h4 className="font-bold text-foreground text-base">
                        Connected with {selectedStartup.name}!
                      </h4>
                      <p className="text-xs max-w-sm mt-1.5 leading-relaxed">
                        You both mutually accepted the connection. Introduce your team, share feedback on milestones, or discuss potential partnerships.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.sender_startup_id === activeStartup?.id;
                      return (
                        <div
                          key={msg.id || i}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-1 px-1">
                            {isMe ? `${msg.sender_name} (You)` : `${msg.sender_name} (${selectedStartup.name})`}
                          </span>
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted/80 border border-border/60 text-foreground rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground/70 mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Footer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t border-border/60 bg-background flex items-center gap-2"
                >
                  <Input
                    placeholder={`Message ${selectedStartup.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 rounded-xl bg-muted/30 border-border/70 text-sm"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={!inputText.trim() || sendingMessage}
                    className="rounded-xl px-4 h-10 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Startups Messaging</h3>
                <p className="text-xs sm:text-sm max-w-md text-muted-foreground">
                  Select a connected startup from the left panel to read and send direct messages. Both teams must accept the connection before messaging unlocks!
                </p>
                {incomingRequests.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setRequestsOpen(true)}
                    className="mt-3 rounded-xl gap-2 border-primary/30 text-primary"
                  >
                    <UserPlus className="h-4 w-4" />
                    Review {incomingRequests.length} Pending Request{incomingRequests.length > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Requests Sheet / Drawer */}
      <Sheet open={requestsOpen} onOpenChange={setRequestsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background">
          <SheetHeader className="p-6 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">Incoming Connect Requests</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Startups that requested to connect and chat with {activeStartup?.name || "your startup"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <h4 className="font-semibold text-foreground text-sm">No Pending Requests</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  When other startups discover you in the Community and click "Connect", their invitations will appear here for you to accept.
                </p>
              </div>
            ) : (
              incomingRequests.map((req) => {
                const requester = allStartups.find((s) => s.id === req.requester_id);
                if (!requester) return null;

                return (
                  <Card key={req.id} className="border-border/70 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 min-h-[3rem] min-w-[3rem] max-h-[3rem] max-w-[3rem] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden shadow-sm">
                          {requester.logo?.startsWith("data:") || requester.logo?.startsWith("http") ? (
                            <img src={requester.logo} alt={requester.name} className="h-full w-full object-cover object-center block" />
                          ) : (
                            <span className="font-bold text-base uppercase">{requester.logo}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-foreground text-base truncate">{requester.name}</h4>
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                              {requester.industry}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {requester.members} Members • Founded {requester.founded}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                        {requester.description}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="hero"
                          size="sm"
                          disabled={processingAction === req.id}
                          onClick={() => handleAcceptRequest(req)}
                          className="flex-1 rounded-xl text-xs gap-1.5 h-9"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Connect & Chat</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingAction === req.id}
                          onClick={() => handleRejectRequest(req)}
                          className="rounded-xl text-xs h-9 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Startup Profile Details Dialog */}
      <Dialog open={!!profileModalStartup} onOpenChange={(open) => !open && setProfileModalStartup(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogTitle className="sr-only">Startup Details</DialogTitle>
          <DialogDescription className="sr-only">Information about this connected startup</DialogDescription>
          {profileModalStartup && (
            <div>
              <div className="h-28 bg-gradient-to-r from-primary/25 via-secondary/20 to-primary/15 relative flex items-end px-6 pb-3">
                <div className="absolute -bottom-8 left-6 h-16 w-16 min-h-[4rem] min-w-[4rem] max-h-[4rem] max-w-[4rem] rounded-2xl bg-card shadow-lg border-2 border-background flex items-center justify-center font-bold text-2xl text-primary overflow-hidden">
                  {profileModalStartup.logo?.startsWith("data:") || profileModalStartup.logo?.startsWith("http") ? (
                    <img src={profileModalStartup.logo} alt={profileModalStartup.name} className="h-full w-full object-cover object-center block" />
                  ) : (
                    <span className="font-bold text-xl uppercase">{profileModalStartup.logo}</span>
                  )}
                </div>
              </div>

              <div className="pt-10 px-6 pb-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">{profileModalStartup.name}</h3>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {profileModalStartup.industry}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {profileModalStartup.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Team Size</span>
                    <span className="font-semibold text-foreground">{profileModalStartup.members} Members</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Founded</span>
                    <span className="font-semibold text-foreground">{profileModalStartup.founded}</span>
                  </div>
                </div>

                {profileModalStartup.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{profileModalStartup.email}</span>
                  </div>
                )}

                {profileModalStartup.website && (
                  <div className="flex items-center gap-2 text-xs">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <a
                      href={profileModalStartup.website.startsWith("http") ? profileModalStartup.website : `https://${profileModalStartup.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {profileModalStartup.website}
                    </a>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setProfileModalStartup(null)}
                  className="w-full rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StartupsChat;
