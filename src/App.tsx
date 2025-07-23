import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { FinancialProvider } from "@/contexts/FinancialContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PrivacyProvider>
        <FinancialProvider>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth onAuthSuccess={() => window.location.href = "/"} />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </FinancialProvider>
      </PrivacyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
