import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Rocket, ArrowRight, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const HomeSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isManaging = searchParams.get("manage") === "true";
  const { user, signOut } = useAuth();
  const { startups, loading, setActiveStartupId, deleteStartup } = useStartup();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);


  const handleOpenStartup = (startupId: string) => {
    setActiveStartupId(startupId);
    navigate("/dashboard", { replace: true });
  };

  const handleDeleteStartup = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Prevent card click
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      setDeletingId(id);
      try {
        await deleteStartup(id);
        toast({ title: "Startup Deleted", description: `"${name}" has been removed.` });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete startup", variant: "destructive" });
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex items-center gap-4 animate-pulse-soft">
          <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-20 md:h-24 w-auto object-contain mix-blend-multiply" />
        </div>
      </div>
    );
  }

  // Filter startups for current user
  const myStartups = startups.filter((s) => s.userRole?.toLowerCase() === "founder");
  const joinedStartups = startups.filter((s) => s.userRole?.toLowerCase() !== "founder");

  return (
    <div className="min-h-screen gradient-hero">
      <TopBar />

      <div className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground mb-10">Select a startup to continue or create a new one</p>

        <div className="mb-10 flex gap-4">
          <Button variant="hero" onClick={() => navigate("/story-intake")} className="gap-2">
            <Plus className="h-4 w-4" /> Create New Startup
          </Button>
          <Button variant="outline" onClick={() => navigate("/join")} className="gap-2">
            <Users className="h-4 w-4" /> Join Organization
          </Button>
        </div>

        {myStartups.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              My Startups ({myStartups.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {myStartups.map(startup => (
                <Card
                  key={startup.id}
                  onClick={() => handleOpenStartup(startup.id)}
                  className="group cursor-pointer hover:shadow-lg transition-all border-border/50 hover:border-primary/30"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="leading-tight">{startup.name}</CardTitle>
                      <div className="flex gap-2 shrink-0">
                        <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Founder
                        </span>

                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {startup.vision || startup.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center pt-0">
                    <Button variant="ghost" size="sm" className="h-8 group-hover:bg-primary/5 ml-auto">
                      Open <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {joinedStartups.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Organizations I Joined ({joinedStartups.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {joinedStartups.map(startup => (
                <Card key={startup.id} onClick={() => handleOpenStartup(startup.id)} className="group cursor-pointer hover:shadow-lg transition-all border-border/50">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="leading-tight">{startup.name}</CardTitle>
                      <div className="flex gap-2 shrink-0">
                        <span className="bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {startup.userRole || "Member"}
                        </span>

                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {startup.vision || startup.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center pt-0">
                    <Button variant="ghost" size="sm" className="h-8 ml-auto">
                      Open <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomeSelection;
