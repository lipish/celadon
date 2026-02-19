import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ClarifyPage from "./pages/ClarifyPage";
import PrdPage from "./pages/PrdPage";
import DevPage from "./pages/DevPage";
import DeployPage from "./pages/DeployPage";
import IteratePage from "./pages/IteratePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clarify" element={<ClarifyPage />} />
          <Route path="/prd" element={<PrdPage />} />
          <Route path="/dev" element={<DevPage />} />
          <Route path="/deploy" element={<DeployPage />} />
          <Route path="/iterate" element={<IteratePage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
