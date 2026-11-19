import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PlanProvider } from "@/context/PlanContext";
import { StartupProvider, useStartup } from "@/hooks/useStartup";
import { TeamProvider } from "@/context/TeamContext";

import { Button } from "@/components/ui/button";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import HomeSelection from "./pages/HomeSelection";
import JoinOrganization from "./pages/JoinOrganization";
import StoryIntake from "./pages/StoryIntake";
import Processing from "./pages/Processing";
import Dashboard from "./pages/Dashboard";
import { StartupDashboard } from "./pages/StartupDashboard";
import Plans from "./pages/Plans";
import TaskDetail from "./pages/TaskDetailsPage";
import CalendarView from "./pages/CalendarView";
import Meetings from "./pages/Meetings";

import Vault from "./pages/Vault";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import WorkTask from "./pages/WorkTask";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Helper component for loading state
const LoadingScreen = () => (
  <div className="min-h-screen gradient-hero flex items-center justify-center">
    <div className="animate-pulse-soft text-primary">Loading...</div>
  </div>
);

// Startup Route wrapper - allows certain pages without active startup
const StartupRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { activeStartup, loading: startupLoading } = useStartup();
  const location = useLocation();
  const navigate = useNavigate();

  if (authLoading || startupLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Pages that don't require an active startup
  const allowedWithoutStartup = [
    "/home",
    "/story-intake",
    "/processing",
    "/join",
  ];

  // If user has no active startup and tries to access a page that requires one
  if (!activeStartup && !allowedWithoutStartup.includes(location.pathname)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

// Protected Route wrapper - for authentication only
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

// Public Route wrapper (redirects to home if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

// FIXED: Home route logic - always show HomeSelection for users with or without startups
const HomeRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <HomeSelection />;
};


import { NavLayout } from "@/components/NavLayout";

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <NavLayout>{children}</NavLayout>
);

import TeamDetailsPage from "@/pages/TeamDetailsPage";
import ProjectSettings from "@/pages/ProjectSettings";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

      {/* Home route - Always shows HomeSelection (which handles startup selection) */}
      <Route path="/home" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />

      {/* Protected routes that require auth but NOT active startup */}
      <Route path="/join" element={<ProtectedRoute><JoinOrganization /></ProtectedRoute>} />
      <Route path="/story-intake" element={<ProtectedRoute><StoryIntake /></ProtectedRoute>} />
      <Route path="/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />

      {/* Global Authenticated Pages (Decoupled from Startup) */}
      <Route path="/community" element={<ProtectedRoute><AuthenticatedLayout><Community /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AuthenticatedLayout><Profile /></AuthenticatedLayout></ProtectedRoute>} />


      {/* Protected routes that require auth AND active startup - Wrapped in NavLayout */}
      <Route path="/dashboard" element={<StartupRoute><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></StartupRoute>} />
      <Route path="/plans" element={<StartupRoute><AuthenticatedLayout><Plans /></AuthenticatedLayout></StartupRoute>} />
      <Route path="/dashboard/:planId" element={<StartupRoute><AuthenticatedLayout><StartupDashboard /></AuthenticatedLayout></StartupRoute>} />
      {/* Deprecated /plans/:taskId - Use /work/... instead */}

      <Route path="/calendar" element={<StartupRoute><AuthenticatedLayout><CalendarView /></AuthenticatedLayout></StartupRoute>} />
      <Route path="/meetings" element={<StartupRoute><AuthenticatedLayout><Meetings /></AuthenticatedLayout></StartupRoute>} />
      <Route path="/team" element={<StartupRoute><AuthenticatedLayout><TeamDetailsPage /></AuthenticatedLayout></StartupRoute>} />

      <Route path="/vault" element={<StartupRoute><AuthenticatedLayout><Vault /></AuthenticatedLayout></StartupRoute>} />
      <Route path="/settings" element={<StartupRoute><AuthenticatedLayout><ProjectSettings /></AuthenticatedLayout></StartupRoute>} />

      {/* NEW: Professional Execution Workspace */}
      <Route path="/work/day/:dayNumber/task/:taskId" element={<StartupRoute><AuthenticatedLayout><WorkTask /></AuthenticatedLayout></StartupRoute>} />


      {/* Redirects */}
      <Route path="/index" element={<Navigate to="/" replace />} />
      <Route path="/organization" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import { ChatWidget } from "@/components/ChatWidget";
import { MeetingNotifier } from "@/components/MeetingNotifier";

const PlanProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { activeStartup } = useStartup();
  return <PlanProvider key={activeStartup?.id || "empty"}>{children}</PlanProvider>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StartupProvider>
            <TeamProvider>
              <PlanProviderWrapper>
                <AppRoutes />
                <ChatWidget />
                <MeetingNotifier />
              </PlanProviderWrapper>
            </TeamProvider>
          </StartupProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;