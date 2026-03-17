// @refresh reset
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
    id: string;
    user_id: string;
    role_id: string;
    role_name: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    status: "online" | "offline";
}

interface TeamContextType {
    members: TeamMember[];
    addMember: (member: Omit<TeamMember, "id" | "status">) => void;
    updateMember: (id: string, updates: Partial<TeamMember>) => void;
    removeMember: (id: string) => void;
    loading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { activeStartup } = useStartup();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadMembers = async () => {
        if (!user || !activeStartup) {
            setMembers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("user_roles")
                .select(`
                    id,
                    role,
                    profiles:user_id ( id, full_name, email, avatar_url )
                `)
                .eq("startup_id", activeStartup.id);

            if (error) throw error;

            if (data) {
                const fetchedMembers = data.map((ur: any) => {
                    const profile = ur.profiles;

                    // Format Role display name
                    let formattedRole = ur.role; // Default exactly to what the database says!
                    
                    // Maintain standard capitalized display logic for core roles if needed, otherwise string passes through
                    if (ur.role === "founder") formattedRole = "Founder";
                    if (ur.role === "co_founder") formattedRole = "Co-Founder";
                    if (ur.role === "team_member") formattedRole = "Team Member";
                    if (ur.role === "viewer") formattedRole = "Viewer";

                    return {
                        id: ur.id,
                        user_id: profile?.id || "unknown",
                        role_id: ur.role, // The raw db string
                        role_name: formattedRole, // The capitalized/pretty string
                        full_name: profile?.full_name || profile?.email?.split('@')[0] || "Unknown User",
                        email: profile?.email || "",
                        avatar_url: profile?.avatar_url,
                        status: "offline" as const // Will be updated by presence
                    };
                });
                setMembers(fetchedMembers);
            }
        } catch (error) {
            console.error("Failed to load team members:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();

        if (activeStartup) {
            const channel = supabase
                .channel(`team_${activeStartup.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `startup_id=eq.${activeStartup.id}` }, () => {
                   loadMembers(); 
                })
                .subscribe();

            const presenceChannel = supabase.channel(`presence_${activeStartup.id}`, {
                config: {
                    presence: {
                        key: user?.id,
                    },
                },
            });

            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const newState = presenceChannel.presenceState();
                    // Each key in newState represents a user ID mapped to an array of presence records
                    const onlineIds = new Set(Object.keys(newState));
                    setOnlineUsers(onlineIds);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && user?.id) {
                        await presenceChannel.track({ online_at: new Date().toISOString() });
                    }
                });

            return () => { 
                supabase.removeChannel(channel); 
                supabase.removeChannel(presenceChannel);
            };
        }
    }, [user, activeStartup?.id]);

    const addMember = (member: Omit<TeamMember, "id" | "status">) => {
        console.warn("Adding member via Context is deprecated. Use Supabase Invite System.");
    };

    const updateMember = async (id: string, updates: Partial<TeamMember>): Promise<void> => {
        try {
            console.log("[TeamContext] updateMember called for user_roles.id:", id, "with updates:", updates);
            
            // Try to extract the requested role label, defaulting to team_member
            const uiRoleInput = updates.role_name || "team_member";
            const lowerRoleInput = uiRoleInput.toLowerCase();
            
            // Maintain original hardcoded mappings if they select the standard dropdowns, otherwise take their custom string literally
            let dbRole = uiRoleInput;
            
            if (lowerRoleInput === "co-founder" || lowerRoleInput === "co_founder") {
                dbRole = "co_founder";
            } else if (lowerRoleInput === "team member" || lowerRoleInput === "team_member") {
                dbRole = "team_member";
            } else if (lowerRoleInput === "viewer") {
                dbRole = "viewer";
            } else if (lowerRoleInput === "founder") {
                dbRole = "founder";
            }
            
            console.log("[TeamContext] Sending raw UI string to DB column Role:", dbRole);

            // Since `role` is now a TEXT column in Supabase, we just throw the string directly inside.
            // We cast to any because the frontend's generated Supabase types still strictly expect the old app_role enum strings.
            const { data, error } = await supabase.from("user_roles").update({ role: dbRole } as any).eq("id", id).select();
            
            console.log("[TeamContext] Supabase update response:", { data, error });

            if (error) {
                console.error("[TeamContext] Failed to update user role:", error);
                throw new Error(error.message || "Failed to update user role in database.");
            }

            if (!data || data.length === 0) {
                 console.warn("[TeamContext] Update succeeded but 0 rows affected. RLS likely blocked the operation.");
                 throw new Error("Update blocked by permissions. Are you sure you are recognized as a Founder?");
            }
            
            // Note: The UI members list will automatically be updated by the Postgres subscription
        } catch (e: any) {
            console.error("Error in updateMember:", e);
            throw e;
        }
    };

    const removeMember = async (id: string): Promise<void> => {
        try {
            console.log("[TeamContext] removeMember called for user_roles.id:", id);
            
            // Delete the row AND select the deleted row to confirm RLS allowed the deletion
            const { data, error } = await supabase.from("user_roles").delete().eq("id", id).select();
            
            console.log("[TeamContext] Supabase delete response:", { data, error });

            if (error) {
                console.error("[TeamContext] Failed to remove member:", error);
                throw new Error(error.message || "Failed to remove member from database.");
            }
            
            if (!data || data.length === 0) {
                 console.warn("[TeamContext] Delete succeeded but 0 rows affected. RLS likely blocked the operation.");
                 throw new Error("Deletion blocked by permissions. Are you sure you are recognized as a Founder?");
            }
            
            // Instantly remove the member from the local UI state so we don't have to wait for the Realtime websocket
            setMembers(prevMembers => prevMembers.filter(member => member.id !== id));
            
        } catch (e: any) {
            console.error("Failed to remove member", e);
            throw e; // Rethrow to let the UI catch it
        }
    };

    const membersWithStatus = members.map(m => ({
        ...m,
        status: (onlineUsers.has(m.user_id) && m.user_id === user?.id) || onlineUsers.has(m.user_id) ? "online" as const : "offline" as const
    }));

    return (
        <TeamContext.Provider value={{ members: membersWithStatus, addMember, updateMember, removeMember, loading }}>
            {children}
        </TeamContext.Provider>
    );
};

export const useTeam = () => {
    const context = useContext(TeamContext);
    if (!context) throw new Error("useTeam must be used within a TeamProvider");
    return context;
};
