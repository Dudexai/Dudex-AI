import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  LogOut,
  Edit2,
  Save,
  X,
  Camera,
  Loader2,
  Crown,
  Shield,
  Users,
  Briefcase,
  AlertCircle,
  Zap,
  Sparkles,
  Trash2,
  Rocket,
  Plus,
  ChevronRight,
  Trophy,
  Flame,
  CheckCircle2,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { usePlan } from "@/context/PlanContext";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { activeStartup, userRole, startups, deleteStartup, setActiveStartupId, refreshStartups } = useStartup();

  const { plan } = usePlan();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userData, setUserData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    company: "",
    avatar_url: "",
    initials: "U",
  });

  const [editForm, setEditForm] = useState(userData);

  const [stats, setStats] = useState({
    streak: 0,
    completedTasks: 0,
    totalTasks: 0,
    badges: 0
  });

  useEffect(() => {
    if (plan) {
      const allTasks = plan.phases.flatMap(p => p.days.flatMap(d => d.tasks));
      const completedCount = allTasks.filter(t => t.status === "completed").length;
      
      // Calculate dynamic badges
      let earnedBadges = 0;
      if (completedCount > 0) earnedBadges++; // First task badge
      if (plan.streak >= 3) earnedBadges++; // 3 day streak badge
      if (plan.streak >= 7) earnedBadges++; // 1 week streak badge
      if (plan.phases[0]?.days.every(d => d.isCompleted)) earnedBadges++; // Phase one badge

      setStats({
        streak: plan.streak || 0,
        completedTasks: completedCount,
        totalTasks: allTasks.length,
        badges: earnedBadges
      });
    }
  }, [plan]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const fallbackName = user.user_metadata?.username || user.email?.split("@")[0] || "User";
      const initials = fallbackName.substring(0, 2).toUpperCase();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error loading profile:", error);
      }

      const profile = {
        id: user.id,
        name: data?.full_name || fallbackName,
        email: data?.email || user.email || "",
        phone: data?.phone || "",
        location: data?.location || "",
        company: data?.company || "",
        avatar_url: data?.avatar_url || "",
        initials,
      };

      setUserData(profile);
      setEditForm(profile);
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (!editForm.name.trim()) {
        toast({ title: "Error", description: "Name is required", variant: "destructive" });
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: editForm.name,
          phone: editForm.phone,
          location: editForm.location,
          company: editForm.company,
          avatar_url: editForm.avatar_url
        });
        
      if (error) throw error;

      const initials = editForm.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      setUserData({ ...editForm, initials });
      setIsEditing(false);
      toast({ title: "Success", description: "Profile updated successfully." });
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(userData);
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || !event.target.files[0] || !user) return;
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setUserData(prev => ({ ...prev, avatar_url: publicUrl }));
      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Auto save the new avatar url
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl });

      setUploading(false);
      toast({ title: "Success", description: "Profile picture updated." });
    } catch (error: any) {
      setUploading(false);
      toast({ title: "Error", description: error.message || "Upload failed", variant: "destructive" });
    }
  };

  const getRoleIcon = (role?: string) => {
    const r = role || userRole || "";
    if (!r) return <Users className="h-4 w-4 text-muted-foreground" />;
    switch (r.toLowerCase()) {
      case "founder": return <Crown className="h-4 w-4 text-amber-500" />;
      case "co-founder": return <Shield className="h-4 w-4 text-amber-500" />;
      case "developer": return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "debugger": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "ai engineer": return <Zap className="h-4 w-4 text-purple-500" />;
      case "marketing member": return <Sparkles className="h-4 w-4 text-pink-500" />;
      default: return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleDisplayName = () => {
    if (!userRole) return "No Active Startup";
    return userRole.charAt(0).toUpperCase() + userRole.slice(1);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSwitchStartup = async (id: string, name: string) => {
    try {
      await setActiveStartupId(id);
      await refreshStartups();
      toast({
        title: "Startup Switched",
        description: `Now working on ${name}`,
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Switch Failed",
        description: "Could not switch startup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStartup = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteStartup(id);
      toast({ title: "Deleted", description: `"${name}" has been removed.` });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader title="Profile" subtitle="Manage your account settings" />

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background">
                    <AvatarImage src={userData.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {userData.initials}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{userData.name}</h2>
                    {userRole && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {getRoleIcon()}
                        <span className="capitalize">{userRole}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Mail size={16} />
                    {userData.email}
                  </p>
                </div>

                {!isEditing && (
                  <Button variant="outline" className="gap-2" onClick={handleEdit}>
                    <Edit2 size={16} /> Edit Profile
                  </Button>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-border/50 text-center">
                <Button variant="hero" className="gap-2" onClick={() => navigate("/plans")}>
                  <Sparkles size={18} /> See How It Works
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User size={18} /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required disabled={saving} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} disabled={saving} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} disabled={saving} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info icon={<Mail size={18} />} label="Email" value={userData.email} />
                  <Info icon={<Phone size={18} />} label="Phone" value={userData.phone || "Not provided"} />
                  <Info icon={<MapPin size={18} />} label="Location" value={userData.location || "Not provided"} />
                  <Info icon={<Building size={18} />} label="Company" value={userData.company || "Not provided"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy size={18} /> Startup Achievements</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{Math.round((stats.completedTasks / (stats.totalTasks || 1)) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <Crown className={`h-6 w-6 mx-auto mb-2 ${stats.badges > 0 ? "text-yellow-500" : "text-muted-foreground opacity-50"}`} />
                <p className="text-2xl font-bold">{stats.badges}</p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
            </CardContent>
          </Card>

          {/* Startup Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Rocket size={18} /> Manage My Startups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {startups.filter(s => s.id !== activeStartup?.id).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl mb-4">
                  <p>No other startups found to switch to.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {startups
                    .filter(s => s.id !== activeStartup?.id)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSwitchStartup(s.id, s.name)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                            {s.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{s.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                                <Users size={10} />
                                <span className="capitalize">{s.userRole || 'Member'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full" onClick={() => navigate("/story-intake")}>
                  <Plus size={16} className="mr-2" /> Create Another Startup
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => navigate("/home?manage=true")}>
                  Manage Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 mt-8">
            <CardContent className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Exit your account safely</p>
              </div>
              <Button variant="destructive" onClick={handleSignOut} className="gap-2 w-full sm:w-auto">
                <LogOut size={16} /> Sign Out
              </Button>
            </CardContent>
          </Card>


        </div >
      </div >
    </div >
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    <div className="text-primary">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  </div>
);

export default Profile;