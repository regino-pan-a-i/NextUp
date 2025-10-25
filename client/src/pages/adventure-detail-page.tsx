import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, DollarSign, Clock, Loader2 } from "lucide-react";
import { Adventure } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdventureDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adventure, isLoading } = useQuery<Adventure>({
    queryKey: ["/api/adventures", id],
    queryFn: async () => {
      const res = await fetch(`/api/adventures/${id}`);
      if (!res.ok) throw new Error("Failed to fetch adventure");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!adventure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Adventure not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setLocation("/adventures");
              }
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1" style={{ fontFamily: "var(--font-heading)" }}>
            Adventure
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">{adventure.name}</h2>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/adventures/${adventure.id}/edit`)}
                    data-testid="button-edit-adventure"
                  >
                    Edit
                  </Button>
            <div className="space-y-3 text-sm">
              {adventure.place && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{adventure.place}</span>
                </div>
              )}

              {adventure.cost && adventure.cost > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${adventure.cost}</span>
                </div>
              )}

              {adventure.timeRequired && adventure.timeRequired > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{Math.floor(adventure.timeRequired / 60)}h {adventure.timeRequired % 60}m</span>
                </div>
              )}

              {adventure.date && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Date: </strong> {format(new Date(adventure.date), "PPP")}
                </div>
              )}

              {adventure.experienceId &&  (() => {
                  function OwnerExperienceButton({ experienceId }: { experienceId: string }) {
                    const { data: experience } = useQuery({
                      queryKey: ["experiences", experienceId],
                      queryFn: async () => {
                        const res = await fetch(`/api/experiences/${experienceId}`);
                        if (!res.ok) return null;
                        return res.json();
                      },
                      enabled: !!experienceId,
                    });

                    const { data: me } = useQuery({
                      queryKey: ["me"],
                      queryFn: async () => {
                        const res = await fetch("/api/me");
                        if (!res.ok) return null;
                        return res.json();
                      },
                    });

                    const ownerId = experience?.user_id ?? experience?.userId;
                    const currentUserId = me?.id ?? me?.user_id ?? me?.userId;

                    if (!experience || !me) return null;
                    if (ownerId !== currentUserId) return null;

                    return (
                      <div className="mt-4">
                        <Button onClick={() => setLocation(`/experiences/${experienceId}`)}>
                          Open related experience
                        </Button>
                      </div>
                    );
                  }

                  return <OwnerExperienceButton experienceId={adventure.experienceId} />;
                })()
              }
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
