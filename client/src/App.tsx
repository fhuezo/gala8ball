import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { WalletConnection } from "@/components/wallet-connection";
import Home from "@/pages/home";
import MarketDetail from "@/pages/market-detail";
import Portfolio from "@/pages/portfolio";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/market/:id" component={MarketDetail} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; walletAddress: string } | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Navigation currentUser={currentUser} />
          <Router />
          <WalletConnection onUserConnected={setCurrentUser} />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
