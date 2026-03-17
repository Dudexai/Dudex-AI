import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Startup {
  id: string;
  name: string;
  description?: string;
  vision?: string;
  created_by: string;
  organization_id?: string;
  created_at: string;
  plan_data?: any;
  progress?: any;
  userRole?: string; // Augmented from user_roles
  role_id?: string;
}

interface StartupContextType {
  startups: Startup[];
  activeStartup: Startup | null;
  userRole: string | null;
  loading: boolean;
  setActiveStartupId: (id: string | null, startup?: Startup) => void;
  deleteStartup: (id: string) => Promise<void>;
  refreshStartups: () => Promise<void>;
}

const StartupContext = createContext<StartupContextType | null>(null);

const STORAGE_KEY_ACTIVE_STARTUP = "dudex_active_startup_id";

export const StartupProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [activeStartup, setActiveStartup] = useState<Startup | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStartups = async () => {
    if (!user) {
      setStartups([]);
      setActiveStartup(null);
      setRole(null);
      setLoading(false);
      return;
    }

    if (startups.length === 0) {
      setLoading(true);
    }

    try {
      // Fetch user's roles and joined startups
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          id,
          role,
          startup_id,
          startups (*)
        `)
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const formattedStartups: Startup[] = userRoles
        .filter((ur) => ur.startups)
        .map((ur) => ({
          ...ur.startups,
          userRole: ur.role,
          role_id: ur.id,
        })) as Startup[];

      setStartups(formattedStartups);

      // Handle Active Startup
      const storedActiveId = sessionStorage.getItem(STORAGE_KEY_ACTIVE_STARTUP);

      let newActive = null;
      if (storedActiveId) {
        newActive = formattedStartups.find(s => s.id === storedActiveId) || null;
      }

      if (!newActive && formattedStartups.length > 0) {
         newActive = formattedStartups[0];
      }

      setActiveStartup(newActive);
      setRole(newActive?.userRole || null);

      if (newActive) {
        sessionStorage.setItem(STORAGE_KEY_ACTIVE_STARTUP, newActive.id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_ACTIVE_STARTUP);
      }
    } catch (error) {
      console.error("Error loading startups:", error);
      setStartups([]);
      setActiveStartup(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteStartup = async (id: string) => {
    try {
      const { error } = await supabase
        .from("startups")
        .delete()
        .eq("id", id);
        
      if (error) throw error;

      const activeId = sessionStorage.getItem(STORAGE_KEY_ACTIVE_STARTUP);
      if (activeId === id) {
        sessionStorage.removeItem(STORAGE_KEY_ACTIVE_STARTUP);
      }

      await loadStartups();
    } catch (error) {
      console.error("Error deleting startup:", error);
    }
  };

  useEffect(() => {
    loadStartups();
  }, [user]);

  // Realtime subscription for startups
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("public:startups")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "startups" },
        (payload) => {
           // Reload silently without triggering full app unmounts
           loadStartups(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const setActiveStartupId = async (id: string | null, startup?: Startup) => {
    if (id) {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE_STARTUP, id);
      const found = startup || startups.find((s) => s.id === id);
      if (found) {
        setActiveStartup(found);
        setRole(found.userRole || "Member");
      }
      
      // Always eagerly reload from DB when manually switching to ensure freshest plan_data
      await loadStartups();
      
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_STARTUP);
      setActiveStartup(null);
      setRole(null);
    }
  };

  return (
    <StartupContext.Provider
      value={{
        startups,
        activeStartup,
        userRole: role,
        loading,
        setActiveStartupId,
        deleteStartup,
        refreshStartups: loadStartups,
      }}
    >
      {children}
    </StartupContext.Provider>
  );
};

export const useStartup = () => {
  const context = useContext(StartupContext);
  if (context === null) {
    throw new Error("useStartup must be used within a StartupProvider");
  }
  return context;
};