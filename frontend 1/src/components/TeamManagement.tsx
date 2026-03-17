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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Users, UserPlus, Trash2, Mail, Copy, Shield, Crown, Briefcase, AlertCircle, Zap, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
// import { supabase } from "@/lib/supabase"; // Removed Supabase

interface TeamMember {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  full_name: string;
  email: string;
}

const roleColors: Record<string, string> = {
  Founder: "bg-primary text-primary-foreground",
  "Co-Founder": "bg-amber-500 text-white",
  Developer: "bg-blue-500 text-white",
  Debugger: "bg-red-500 text-white",
  "AI Engineer": "bg-purple-500 text-white",
  "Team Member": "bg-secondary text-secondary-foreground",
  "Marketing Member": "bg-pink-500 text-white",
};

const roleIcons: Record<string, React.ReactNode> = {
  Founder: <Crown className="h-3 w-3" />,
  "Co-Founder": <Shield className="h-3 w-3" />,
  Developer: <Briefcase className="h-3 w-3" />,
  Debugger: <AlertCircle className="h-3 w-3" />,
  "AI Engineer": <Zap className="h-3 w-3" />,
  "Team Member": <Users className="h-3 w-3" />,
  "Marketing Member": <Sparkles className="h-3 w-3" />,
};

export const TeamManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup, userRole } = useStartup();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [organizationCode, setOrganizationCode] = useState("");

  const isFounder = userRole === "Founder" || userRole === "Co-Founder";

  useEffect(() => {
    if (!activeStartup) return;

    const loadTeamData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock members
      const mockMembers: TeamMember[] = [
        {
          id: "m1",
          user_id: user?.id || "u1",
          role_id: "founder",
          role_name: "Founder",
          full_name: user?.email?.split("@")[0] || "Me",
          email: user?.email || "me@example.com"
        },
        // Add random mock member
        {
          id: "m2",
          user_id: "u2",
          role_id: "member",
          role_name: "Member",
          full_name: "Alice Cooper",
          email: "alice@example.com"
        }
      ];

      setMembers(mockMembers);
      setLoading(false);
    };

    loadTeamData();
    setOrganizationCode((activeStartup as any).organization_code || "");
  }, [activeStartup, user]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    toast({
      title: "Invite Sent",
      description: `Invitation sent to ${inviteEmail} (Mock)`
    });

    setInviteDialogOpen(false);
    setInviteEmail("");
    setInviting(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast({ title: "Member Removed", description: "Team member has been removed" });
  };

  const copyOrganizationCode = async () => {
    if (!organizationCode) return;
    await navigator.clipboard.writeText(organizationCode);
    toast({ title: "Copied!", description: "Organization code copied to clipboard" });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading team members...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Management
        </CardTitle>
        <CardDescription>Manage your startup team members and invites</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Organization Code */}
          {isFounder && organizationCode && (
            <div className="mb-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Organization Code</p>
                  <p className="text-sm text-muted-foreground">
                    Share this code with people you want to invite
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-secondary rounded-md font-mono">
                    {organizationCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyOrganizationCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Invite Button */}
          {isFounder && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mb-4">
                  <UserPlus className="h-4 w-4 mr-2" /> Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this startup
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="team@member.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={inviting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRoleId}
                      onValueChange={setInviteRoleId}
                      disabled={inviting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Co-Founder">Co-Founder</SelectItem>
                        <SelectItem value="Developer">Developer</SelectItem>
                        <SelectItem value="Debugger">Debugger</SelectItem>
                        <SelectItem value="AI Engineer">AI Engineer</SelectItem>
                        <SelectItem value="Team Member">Team Member</SelectItem>
                        <SelectItem value="Marketing Member">Marketing Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    disabled={inviting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim() || !inviteRoleId}
                  >
                    {inviting ? "Sending..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Team Members Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Email</TableHead>
                <TableHead>Role</TableHead>
                {isFounder && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`flex items-center gap-1 ${roleColors[member.role_name] || "bg-secondary"}`}>
                      {roleIcons[member.role_name]}
                      {member.role_name}
                    </Badge>
                  </TableCell>
                  {isFounder && member.role_name !== "Founder" && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={member.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No team members yet. Invite someone to get started!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};