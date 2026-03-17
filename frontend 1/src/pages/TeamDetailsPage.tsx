import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { useTeam, TeamMember } from "@/context/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2, Mail, Plus, Search, Sparkles } from "lucide-react";

const roleColors: Record<string, string> = {
    Founder: "bg-primary text-primary-foreground",
    "Co-Founder": "bg-amber-500 text-white",
    Developer: "bg-blue-500 text-white",
    Debugger: "bg-red-500 text-white",
    "AI Engineer": "bg-purple-500 text-white",
    "Team Member": "bg-secondary text-secondary-foreground",
    "Marketing Member": "bg-pink-500 text-white",
};

export default function TeamDetailsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { activeStartup, userRole } = useStartup();

    const { members, addMember, updateMember, removeMember, loading } = useTeam();
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviteRoleId, setInviteRoleId] = useState("Team Member");
    const [customRole, setCustomRole] = useState("");
    const [inviting, setInviting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [editMember, setEditMember] = useState<TeamMember | null>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState("");
    const [editCustomRole, setEditCustomRole] = useState("");

    const currentUserMember = members.find(m => m.user_id === user?.id);
    const isFounder = 
        currentUserMember?.role_id === "founder" || 
        currentUserMember?.role_id === "co_founder" || 
        userRole?.toLowerCase() === "founder" || 
        userRole?.toLowerCase() === "co_founder";

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !activeStartup || !user) {
            toast({ title: "Error", description: "Email is required.", variant: "destructive" });
            return;
        }
        setInviting(true);

        // Map UI roles to DB
        let dbRole = inviteRoleId;
        if (inviteRoleId === "Team Member") dbRole = "team_member";
        if (inviteRoleId === "Co-Founder") dbRole = "co_founder";
        if (inviteRoleId === "Viewer") dbRole = "viewer";
        if (inviteRoleId === "custom" && customRole.trim() !== "") {
            dbRole = customRole.trim();
        }

        const token = crypto.randomUUID();

        try {
            const { error } = await supabase.from('invites').insert({
                email: inviteEmail.trim(),
                organization_id: activeStartup.organization_id,
                startup_id: activeStartup.id,
                role: dbRole as any,
                token: token,
                invited_by: user.id
            });

            if (error) {
                if (error.code === '23505') {
                    throw new Error("This email has already been invited.");
                }
                throw error;
            }

            toast({
                title: "Invite Sent",
                description: `Invitation link generated for ${inviteEmail}`
            });

            const inviteLink = `${window.location.origin}/join?token=${token}`;
            
            try {
                const response = await fetch("http://localhost:8000/send-invite", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        to_email: inviteEmail.trim(),
                        startup_name: activeStartup.name,
                        inviter_email: user.email,
                        invite_url: inviteLink,
                        token: token
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to send invite email through backend.");
                }

                toast({
                    title: "Invite Delivered!",
                    description: `An official email invitation has been dispatched to ${inviteEmail}.`,
                });
            } catch (err) {
                console.error("Backend Email Error:", err);
                toast({
                    title: "Token Generated (Email Failed)",
                    description: `Invite created, but backend email dispatch failed. Give them this token manually: ${token}`,
                    variant: "destructive"
                });
            }

            setInviteDialogOpen(false);
            setInviteEmail("");
            setInviteName("");
            setInviteRoleId("Team Member");
            setCustomRole("");
        } catch (error: any) {
             toast({
                title: "Invite Failed",
                description: error.message || "Failed to send invite.",
                variant: "destructive"
            });
        } finally {
            setInviting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editMember) return;

        const finalRole = editRole === "custom" ? editCustomRole : editRole;

        try {
            await updateMember(editMember.id, {
                full_name: editName,
                email: editEmail,
                role_name: finalRole,
                role_id: finalRole.toLowerCase().replace(/\s+/g, '-')
            });

            toast({ title: "Member Updated", description: "Team member details updated successfully." });
            setEditMember(null);
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message || "Could not update role.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        try {
            await removeMember(id);
            toast({ title: "Member Removed", description: `${name} has been removed from the team.` });
        } catch (error: any) {
            toast({
                title: "Removal Failed",
                description: error.message || "Could not delete this member.",
                variant: "destructive"
            });
        }
    };

    const filteredMembers = members.filter(member =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#FDF8F3] pb-20">
            <TopBar />
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
                <div className="bg-gradient-to-r from-[#FFF0E0] to-[#FFE0C2] rounded-2xl p-6 mb-8 shadow-sm border border-[#FFE0B2]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white/50 flex items-center justify-center border-2 border-white shadow-sm">
                            <Sparkles className="h-6 w-6 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-display font-medium text-[#5D4037]">{activeStartup?.name || "Startup Name"}</h2>
                    </div>
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-10 bg-white border-none shadow-sm h-12 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <h3 className="text-lg font-medium text-[#5D4037] mb-4">All Members</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow group relative">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                        <AvatarImage src={member.avatar_url} />
                                        <AvatarFallback className="bg-[#FFF0E0] text-[#5D4037]">{member.full_name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-medium text-[#3E2723]">{member.full_name}</h4>
                                        <p className="text-xs text-muted-foreground mb-1">{member.role_name}</p>
                                        <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${member.status === 'online' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {member.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                        <Mail className="h-3.5 w-3.5" />
                                    </Button>
                                    {isFounder && member.user_id !== user?.id && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                                                onClick={() => {
                                                    setEditMember(member);
                                                    setEditName(member.full_name);
                                                    setEditEmail(member.email);
                                                    setEditRole(member.role_name);
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                onClick={() => handleDelete(member.id, member.full_name)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                            <div className="px-4 pb-4">
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                </p>
                            </div>
                        </Card>
                    ))}

                    {isFounder && (
                        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                            <DialogTrigger asChild>
                                <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#FFE0B2] rounded-xl bg-transparent hover:bg-[#FFF8F0] transition-colors h-full min-h-[140px] group">
                                    <div className="h-10 w-10 rounded-full bg-[#FFF0E0] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Plus className="h-6 w-6 text-[#5D4037]" />
                                    </div>
                                    <span className="font-medium text-[#5D4037]">Invite More</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent aria-describedby={undefined}>
                                <DialogHeader>
                                    <DialogTitle>Invite Team Member</DialogTitle>
                                    <DialogDescription>
                                        Send an invitation to join {activeStartup?.name}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            placeholder="colleague@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Team Member">Team Member</SelectItem>
                                                <SelectItem value="Developer">Developer</SelectItem>
                                                <SelectItem value="Marketing">Marketing</SelectItem>
                                                <SelectItem value="Co-Founder">Co-Founder</SelectItem>
                                                <SelectItem value="custom">Custom...</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {inviteRoleId === "custom" && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                            <Label htmlFor="custom-role">Custom Role Name</Label>
                                            <Input
                                                id="custom-role"
                                                placeholder="e.g. Lead Designer"
                                                value={customRole}
                                                onChange={(e) => setCustomRole(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleInvite} disabled={inviting}>
                                        {inviting ? "Sending..." : "Send Invite"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}

                </div>

            </div>

            {/* Edit Member Dialog */}
            <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
                <DialogContent aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>Modify Team Member</DialogTitle>
                        <DialogDescription>
                            Update role and details for {editMember?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Team Member">Team Member</SelectItem>
                                    <SelectItem value="Developer">Developer</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Co-Founder">Co-Founder</SelectItem>
                                    <SelectItem value="custom">Custom...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {editRole === "custom" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <Label htmlFor="edit-custom-role">Custom Role Name</Label>
                                <Input
                                    id="edit-custom-role"
                                    placeholder="e.g. Lead Designer"
                                    value={editCustomRole}
                                    onChange={(e) => setEditCustomRole(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mt-8 text-center text-xs text-muted-foreground">
                Getting started with {activeStartup?.name}. Will sync with your Dude X AI progress and dashboard.
            </div>

        </div>
    );
}
