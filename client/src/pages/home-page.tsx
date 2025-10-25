import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExperienceCard } from "@/components/experience-card";
import { Plus, TrendingUp, CheckCircle2, Users as UsersIcon, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Experience } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: experiences = [], isLoading: loadingExperiences } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
  });

  const nextUpExperiences = experiences.filter(e => e.status === "NextUp").slice(0, 3);
  const completedCount = experiences.filter(e => e.status === "Completed").length;

  const stats = [
    { label: "Experiences", value: experiences.length, icon: TrendingUp },
    { label: "Completed", value: completedCount, icon: CheckCircle2 },
    { label: "Friends", value: friends.length, icon: UsersIcon },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                NextUp
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.username}!
              </p>
            </div>
            <Button 
              size="icon"
              onClick={() => setLocation("/experiences/create")}
              data-testid="button-create-experience"
              className="rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-card-border">
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 space-y-6">
        {/* NextUp Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              NextUp
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/experiences")}
              data-testid="button-view-all-experiences"
            >
              View all
            </Button>
          </div>

          {loadingExperiences ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : nextUpExperiences.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nextUpExperiences.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Your NextUp queue is empty</p>
              <p className="text-sm mt-1">Add experiences to get started!</p>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Recent Activity
          </h2>
          
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Connect with friends to see updates!</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
