import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Github } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async () => {
    if (mode === "signup") {
      if (!username.trim()) {
        toast({ title: "Error", description: "Username is required for signup.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
        return;
      }
    }

    try {
      setLoading(true);
      const { error } = mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password, { data: { username } });

      if (error) throw error;

      if (mode === "signup") {
        toast({
          title: "Success",
          description: "'Please confirm the mail' request send to your provided mailid",
        });
      }

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[340px] animate-fade-in-up">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-16 w-auto object-contain drop-shadow-sm mix-blend-multiply" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            {mode === "login" ? "Sign in to DudexAI" : "Sign up for DudexAI"}
          </h1>
        </div>

        <Card className="shadow-elevated border-border">
          <CardContent className="pt-6 space-y-4">
            {/* Social Login Buttons */}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  setLoading(true);
                  await signInWithGoogle();
                } catch (error: any) {
                  toast({
                    title: "Google Auth Failed",
                    description: error.message,
                    variant: "destructive",
                  });
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1 animate-fade-in-down">
                  <Label htmlFor="username">User Name</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Startup Founder"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email">{mode === "login" ? "Username or email address" : "Email address"}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button className="text-xs text-primary hover:underline bg-transparent border-0 p-0 h-auto">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {mode === "signup" && (
                <div className="space-y-1 animate-fade-in-up">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button
              variant="hero"
              className="w-full"
              onClick={handleAuth}
              disabled={loading}
            >
              {loading ? "Loading..." : (mode === "login" ? "Sign in" : "Sign up")}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4 text-center p-4 border border-border rounded-md text-sm text-muted-foreground bg-card/50">
          {mode === "login" ? "New to DudexAI? " : "Already have an account? "}
          <button
            onClick={toggleMode}
            className="text-primary hover:underline bg-transparent border-0 p-0 inline font-medium"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
          .
        </div>
      </div>
    </div>
  );
};

export default Auth;