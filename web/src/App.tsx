import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import Index from "./pages/Index";
import ClarifyPage from "./pages/ClarifyPage";
import PrdPage from "./pages/PrdPage";
import DevPage from "./pages/DevPage";
import DeployPage from "./pages/DeployPage";
import IteratePage from "./pages/IteratePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<Index />} />
              <Route path="/clarify" element={<RequireAuth><ClarifyPage /></RequireAuth>} />
              <Route path="/prd" element={<RequireAuth><PrdPage /></RequireAuth>} />
              <Route path="/dev" element={<RequireAuth><DevPage /></RequireAuth>} />
              <Route path="/deploy" element={<RequireAuth><DeployPage /></RequireAuth>} />
              <Route path="/iterate" element={<RequireAuth><IteratePage /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><AdminSettingsPage /></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
