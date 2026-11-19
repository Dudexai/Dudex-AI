import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Key,
  User,
  Link2,
  Copy,
  Check,
  Folder,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";

interface VaultItem {
  id: string;
  title: string;
  url: string;
  username?: string;
  password?: string;
  notes?: string;
  type: "credential" | "api-key" | "secret";
}

interface SharedLink {
  id: string;
  title: string;
  url: string;
  category: string;
  notes?: string;
}

const Vault = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup } = useStartup();

  const isFounder = Boolean(activeStartup && user && activeStartup.created_by === user.id);

  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasPasswordSet, setHasPasswordSet] = useState<boolean | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    title: "",
    url: "",
    username: "",
    password: "",
    notes: "",
    type: "credential" as const,
  });
  const [newLink, setNewLink] = useState({
    title: "",
    url: "",
    category: "general",
    notes: "",
  });

  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [links, setLinks] = useState<SharedLink[]>([]);

  const loadVaultItems = async () => {
    if (!user || !activeStartup || !isUnlocked) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('startup_id', activeStartup.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const secrets = data.filter(item => item.type !== 'link' && !item.type.startsWith('link:'));
      const userLinks = data.filter(item => item.type === 'link' || item.type.startsWith('link:'));

      setVaultItems(secrets.map(s => ({
         id: s.id,
         title: s.name,
         url: s.url || '',
         username: s.notes?.startsWith('username:') ? s.notes.split('\n')[0].replace('username:', '').trim() : '',
         password: s.encrypted_value || '',
         notes: s.notes?.includes('\nNotes:') ? s.notes.split('\nNotes:')[1].trim() : s.notes || '',
         type: s.type as any
      })));

      setLinks(userLinks.map(l => ({
         id: l.id,
         title: l.name,
         url: l.url || '',
         category: l.type.includes(':') ? l.type.split(':')[1] : 'general',
         notes: l.notes || ''
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeStartup && isUnlocked) {
      loadVaultItems();
    }
  }, [user, activeStartup, isUnlocked]);
  
  // Check if founder has a vault password set for the team
  useEffect(() => {
    const checkUserPassword = async () => {
      if (!activeStartup) return;
      const { data, error } = await supabase
        .from('startups')
        .select('vault_password')
        .eq('id', activeStartup.id)
        .maybeSingle();
        
      if (!error && data) {
         setHasPasswordSet(!!(data as any).vault_password);
      } else {
         setHasPasswordSet(false);
      }
    };
    checkUserPassword();
  }, [activeStartup]);

  const categories = [
    { id: "general", label: "General" },
    { id: "docs", label: "Documentation" },
    { id: "design", label: "Design" },
    { id: "dev", label: "Development" },
    { id: "tools", label: "Tools" },
  ];

  const handleUnlock = async () => {
    if (!user || !activeStartup) return;
    
    // Creating a new password
    if (hasPasswordSet === false) {
        if (!isFounder) {
            toast({ title: "Vault Not Setup", description: "The startup founder has not set up the team vault yet.", variant: "destructive" });
            return;
        }
        if (vaultPassword.length < 8) {
            toast({ title: "Invalid Password", description: "Password must be at least 8 characters.", variant: "destructive" });
            return;
        }
        if (vaultPassword !== confirmPassword) {
            toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
            return;
        }
        
        const { error } = await supabase.from('startups').update({ vault_password: vaultPassword } as any).eq('id', activeStartup.id);
        if (error) {
            toast({ title: "Error", description: "Could not set vault password.", variant: "destructive" });
            return;
        }
        setHasPasswordSet(true);
        setIsUnlocked(true);
        toast({ title: "Vault Unlocked", description: "The team master password has been set." });
        loadVaultItems(); // Load items after setting password and unlocking
        return;
    }
    
    // Unlocking existing vault
    const { data, error } = await supabase.from('startups').select('vault_password').eq('id', activeStartup.id).single();
    
    if (error || (data as any)?.vault_password !== vaultPassword) {
      toast({
        title: "Invalid Password",
        description: "Incorrect vault password.",
        variant: "destructive",
      });
      return;
    }

    setIsUnlocked(true);
    toast({
      title: "Vault Unlocked",
      description: "You now have access to the team's secrets and links.",
    });
    loadVaultItems(); // Load items after unlocking
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setVaultPassword("");
    setConfirmPassword("");
    setShowPasswords({});
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddItem = async () => {
    if (!newItem.title || !newItem.password || !activeStartup || !user) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and secret/password.",
        variant: "destructive",
      });
      return;
    }

    let compositeNotes = "";
    if (newItem.username) compositeNotes += `username:${newItem.username}\n`;
    if (newItem.notes) compositeNotes += `Notes:${newItem.notes}`;

    const { data, error } = await supabase
      .from('vault_items')
      .insert({
        name: newItem.title,
        url: newItem.url || null,
        encrypted_value: newItem.password,
        notes: compositeNotes || null,
        type: newItem.type,
        is_personal: false,
        user_id: user.id,
        startup_id: activeStartup.id
      })
      .select()
      .single();

    if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
       return;
    }

    const item: VaultItem = {
      id: data.id,
      ...newItem,
    };

    setVaultItems([item, ...vaultItems]);
    setNewItem({ title: "", url: "", username: "", password: "", notes: "", type: "credential" });
    setShowAddForm(false);

    toast({
      title: "Secret Added",
      description: "Your secret has been saved to the vault.",
    });
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (!error) {
       setVaultItems(vaultItems.filter(item => item.id !== id));
       toast({
         title: "Secret Deleted",
         description: "The secret has been removed from the vault.",
       });
    }
  };

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Link Copied",
      description: "URL copied to clipboard.",
    });
  };

  const handleAddLink = async () => {
    if (!newLink.title || !newLink.url || !activeStartup || !user) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and URL.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('vault_items')
      .insert({
        name: newLink.title,
        url: newLink.url,
        notes: newLink.notes || null,
        type: `link:${newLink.category}`,
        is_personal: false,
        user_id: user.id,
        startup_id: activeStartup.id
      })
      .select()
      .single();

    if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
       return;
    }

    const link: SharedLink = {
      id: data.id,
      ...newLink,
    };

    setLinks([link, ...links]);
    setNewLink({ title: "", url: "", category: "general", notes: "" });
    setShowAddLinkForm(false);

    toast({
      title: "Link Added",
      description: "Your link has been saved.",
    });
  };

  const handleDeleteLink = async (id: string) => {
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (!error) {
      setLinks(links.filter(l => l.id !== id));
      toast({
        title: "Link Deleted",
        description: "The link has been removed.",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "api-key":
        return <Key className="h-5 w-5 text-primary" />;
      case "secret":
        return <Shield className="h-5 w-5 text-primary" />;
      default:
        return <Lock className="h-5 w-5 text-primary" />;
    }
  };

  const groupedLinks = categories.map(cat => ({
    ...cat,
    links: links.filter(l => l.category === cat.id),
  })).filter(cat => cat.links.length > 0);

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/organization" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Team Vault"
          subtitle="Secure shared storage for startup credentials, secrets & links"
          showBack={false}
        />

        {/* Team Vault Info */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 animate-fade-in opacity-0">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm text-foreground">
            <strong>Team Vault</strong> — These secrets and links are shared securely with your startup team. Only the founder can add/remove items.
          </span>
        </div>

        {!isUnlocked ? (
          /* Lock Screen */
          <div className="mx-auto max-w-md">
            <Card className="animate-scale-in">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <Shield className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold font-display mt-4">
                  {hasPasswordSet === false ? "Setup Vault Password" : "Vault is Locked"}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  {hasPasswordSet === false 
                    ? "Create a master password to secure the team's secrets and links."
                    : "Enter the team's vault password to access shared secrets and links."}
                </p>
              </div>

              <div className="space-y-4 max-w-sm mx-auto text-left">
                <div className="space-y-2 relative">
                    <Label htmlFor="vault-password">
                        {hasPasswordSet === false ? "Create Password" : "Vault Password"}
                    </Label>
                  <div className="relative">
                    <Input
                      id="vault-password"
                      type={showPasswords['vault-master'] ? "text" : "password"}
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      disabled={hasPasswordSet === false && !isFounder}
                      placeholder={hasPasswordSet === false ? (isFounder ? "Create a master password (>8 chars)" : "Founder must create password first") : "Enter vault password"}
                      onKeyDown={(e) => e.key === 'Enter' && (!hasPasswordSet ? confirmPassword && handleUnlock() : handleUnlock())}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => togglePasswordVisibility('vault-master')}
                      disabled={hasPasswordSet === false && !isFounder}
                    >
                      {showPasswords['vault-master'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {hasPasswordSet === false && isFounder && (
                    <div className="space-y-2 relative">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type={showPasswords['vault-master'] ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your master password"
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        />
                    </div>
                )}

                <Button
                  className="w-full gap-2 mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleUnlock}
                  disabled={hasPasswordSet === false && !isFounder}
                >
                  <Unlock className="h-4 w-4" /> 
                  {hasPasswordSet === false ? "Set Password & Unlock" : "Unlock Vault"}
                </Button>
                
                {hasPasswordSet === true && (
                    <p className="text-[10px] text-center text-muted-foreground mt-4">
                        If you forgot your password, please contact an administrator to reset it.
                    </p>
                )}
              </div>
            </Card>

            {/* Security Warning */}
            <Card className="mt-6 border-destructive/30 bg-destructive/5 animate-fade-in opacity-0 stagger-1">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Security Notice</p>
                    <p className="text-sm text-muted-foreground">
                      This vault contains the team's shared credentials, API keys, and links.
                      Never share vault access externally or take screenshots.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Unlocked View with Tabs */
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between animate-fade-in opacity-0">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Vault Unlocked</p>
                  <p className="text-sm text-muted-foreground">{vaultItems.length} secrets • {links.length} links</p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleLock}>
                <Lock className="h-4 w-4 mr-2" />
                Lock Vault
              </Button>
            </div>

            {/* Tabs for Secrets and Links */}
            <Tabs defaultValue="secrets" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="secrets" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Secrets
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  My Links
                </TabsTrigger>
              </TabsList>

              {/* Secrets Tab */}
              <TabsContent value="secrets" className="space-y-6 mt-6">
                {isLoading ? (
                  <div className="flex justify-center p-12">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {isFounder && (
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Secret
                        </Button>
                      </div>
                    )}

                    {/* Add Secret Form */}
                    {showAddForm && (
                      <Card className="animate-scale-in border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add New Secret
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Title *</Label>
                              <Input
                                placeholder="e.g., Production DB"
                                value={newItem.title}
                                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>URL</Label>
                              <Input
                                placeholder="https://..."
                                value={newItem.url}
                                onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Username</Label>
                              <Input
                                placeholder="admin"
                                value={newItem.username}
                                onChange={(e) => setNewItem({ ...newItem, username: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password / Secret *</Label>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                value={newItem.password}
                                onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Notes</Label>
                              <Input
                                placeholder="Important notes about this secret..."
                                value={newItem.notes}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>
                              Cancel
                            </Button>
                            <Button variant="hero" onClick={handleAddItem}>
                              Save Secret
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Vault Items Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {vaultItems.map((item, index) => (
                        <Card
                          key={item.id}
                          className={`animate-fade-in-up opacity-0 stagger-${index + 1} border-primary/10`}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-primary/10 p-2">
                                  {getTypeIcon(item.type)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-foreground">{item.title}</h3>
                                  <span className="text-xs text-muted-foreground capitalize">{item.type.replace("-", " ")}</span>
                                </div>
                              </div>
                              {isFounder && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {item.url && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                  >
                                    {item.url}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}

                              {item.username && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                                  <p className="text-sm text-foreground font-mono">{item.username}</p>
                                </div>
                              )}

                              {item.password && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {item.type === "api-key" ? "API Key" : "Password"}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                      {showPasswords[item.id] ? item.password : "••••••••••••••••"}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => togglePasswordVisibility(item.id)}
                                    >
                                      {showPasswords[item.id] ? (
                                        <EyeOff className="h-3 w-3" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {item.notes && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                  <p className="text-sm text-destructive/80 bg-destructive/5 px-2 py-1 rounded">
                                    {item.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* My Links Tab */}
              <TabsContent value="links" className="space-y-6 mt-6">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary/10 p-2">
                          <Link2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Team Links</p>
                          <p className="text-sm text-muted-foreground">{links.length} links saved</p>
                        </div>
                      </div>
                      {isFounder && (
                        <Button variant="outline" onClick={() => setShowAddLinkForm(!showAddLinkForm)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Link
                        </Button>
                      )}
                    </div>

                    {/* Add Link Form */}
                    {showAddLinkForm && (
                      <Card className="animate-scale-in border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add New Link
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Title *</Label>
                              <Input
                                placeholder="e.g., Team Wiki"
                                value={newLink.title}
                                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>URL *</Label>
                              <Input
                                placeholder="https://..."
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Category</Label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newLink.category}
                                onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Input
                                placeholder="Optional notes..."
                                value={newLink.notes}
                                onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowAddLinkForm(false)}>
                              Cancel
                            </Button>
                            <Button variant="hero" onClick={handleAddLink}>
                              Save Link
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Grouped Links */}
                    <div className="space-y-6">
                      {groupedLinks.map((category, catIndex) => (
                        <div key={category.id} className={`animate-fade-in-up opacity-0 stagger-${catIndex + 1}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Folder className="h-4 w-4 text-primary" />
                            <h3 className="font-medium text-foreground">{category.label}</h3>
                            <span className="text-sm text-muted-foreground">({category.links.length})</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {category.links.map((link) => (
                              <Card key={link.id} className="hover:shadow-elevated transition-shadow">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="rounded-lg bg-primary/10 p-1.5">
                                        <Link2 className="h-4 w-4 text-primary" />
                                      </div>
                                      <h4 className="font-medium text-foreground">{link.title}</h4>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleCopyLink(link.id, link.url)}
                                      >
                                        {copiedId === link.id ? (
                                          <Check className="h-3.5 w-3.5 text-primary" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                      {isFounder && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleDeleteLink(link.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
                                  >
                                    {link.url}
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                  {link.notes && (
                                    <p className="mt-2 text-sm text-muted-foreground">{link.notes}</p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vault;