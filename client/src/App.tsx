import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ExperiencesPage from "@/pages/experiences-page";
import CreateExperiencePage from "@/pages/create-experience-page";
import ExperienceDetailPage from "@/pages/experience-detail-page";
import FriendsPage from "@/pages/friends-page";
import AdventuresPage from "@/pages/adventures-page";
import CreateAdventurePage from "@/pages/create-adventure-page";
import AdventureDetailPage from "@/pages/adventure-detail-page";
import ProfilePage from "@/pages/profile-page";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/experiences" component={ExperiencesPage} />
      <ProtectedRoute path="/experiences/create" component={CreateExperiencePage} />
      <ProtectedRoute path="/experiences/:id" component={ExperienceDetailPage} />
  <ProtectedRoute path="/friends" component={FriendsPage} />
  <ProtectedRoute path="/adventures" component={AdventuresPage} />
  <ProtectedRoute path="/adventures/create" component={CreateAdventurePage} />
  <ProtectedRoute path="/adventures/:id" component={AdventureDetailPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
