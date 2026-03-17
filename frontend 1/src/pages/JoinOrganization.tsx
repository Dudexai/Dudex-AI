import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Link as LinkIcon, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY_STARTUPS = "dudex_startups";

const JoinOrganization = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshStartups } = useStartup();

  const [orgCode, setOrgCode] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setTokenFromUrl(token);
      setInviteToken(token);
    }
  }, [searchParams]);

  const handleJoinByCode = async () => {
    if (!orgCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization code",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to join an organization",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_join_request', {
        p_code_or_token: orgCode.trim()
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: `You have joined ${(data as any).organization_name}`,
      });

      await refreshStartups();
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Error joining organization:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join organization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByToken = async () => {
    if (!inviteToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invite token",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to accept the invite",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_join_request', {
        p_code_or_token: inviteToken.trim()
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome!",
        description: `You have successfully joined ${(data as any).organization_name}`,
      });

      await refreshStartups();
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/home")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-10 md:h-12 w-auto object-contain mix-blend-multiply" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-10 animate-fade-in opacity-0">
            <div className="mx-auto mb-4 w-fit rounded-2xl bg-secondary p-4">
              <Users className="h-10 w-10 text-secondary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Join an Organization
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your organization code or use an invite link
            </p>
          </div>

          <div className="space-y-6">
            <Card className="animate-fade-in-up opacity-0 stagger-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Join with Code or Project ID
                </CardTitle>
                <CardDescription>
                  Enter the Organization Code or Project ID shared by your founder
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-code">Organization Code / Project ID</Label>
                  <Input
                    id="org-code"
                    placeholder="e.g., ORG-ABCDEF or xxxxxxxx-xxxx-..."
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    className="text-center text-lg"
                  />
                </div>
                <Button
                  variant="hero"
                  className="w-full gap-2"
                  onClick={handleJoinByCode}
                  disabled={loading || !orgCode.trim()}
                >
                  {loading ? (
                    "Joining..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Join Organization
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Card className="animate-fade-in-up opacity-0 stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Use Invite Link
                </CardTitle>
                <CardDescription>
                  Paste the invite token from your email invitation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-token">Invite Token</Label>
                  <Input
                    id="invite-token"
                    placeholder="Paste your invite token here"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                {tokenFromUrl && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Token detected from invite link
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleJoinByToken}
                  disabled={loading || !inviteToken.trim()}
                >
                  {loading ? (
                    "Accepting..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Invite
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 animate-fade-in-up opacity-0 stagger-3">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Need an invite?</p>
                  <p className="mt-1">
                    Ask your team founder or admin to share the organization code or send you an invite link.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;