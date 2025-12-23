import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import Clients from "@/pages/Clients";
import Feedback from "@/pages/Feedback";
import MapPage from "@/pages/Map";
import Staff from "@/pages/Staff";
import JobDetails from "@/pages/JobDetails";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetails} />
      <Route path="/clients" component={Clients} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/map" component={MapPage} />
      <Route path="/staff" component={Staff} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
