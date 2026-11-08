import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { useNoteReminders } from "./hooks/useNoteReminders";
import { useAppLock } from "./hooks/useAppLock";
import { AppLockScreen } from "./components/ui/app-lock-screen";

const queryClient = new QueryClient();

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useNoteReminders();
  return <>{children}</>;
};

const AppLockWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLocked, hasPin, loading } = useAppLock();
  const [unlocked, setUnlocked] = useState(false);

  // If the app is locked and user hasn't unlocked it yet
  if (!loading && hasPin && isLocked && !unlocked) {
    return <AppLockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPath = location.pathname;
  const authMode = new URLSearchParams(location.search).get('mode');
  if (user && (currentPath === '/' || currentPath === '/auth')) {
    return <Navigate to="/app" replace />;
  }
  if (!user && currentPath === '/app') {
    return <Navigate to="/" replace />;
  }
  if (!user && currentPath === '/auth' && !authMode) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={
        <AppLockWrapper>
          <Index />
        </AppLockWrapper>
      } />
      <Route path="/auth" element={<Auth onAuthSuccess={() => window.location.href = "/app"} />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PrivacyProvider>
        <FinancialProvider>
          <NotificationProvider>
            <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </ThemeProvider>
          </NotificationProvider>
        </FinancialProvider>
      </PrivacyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
