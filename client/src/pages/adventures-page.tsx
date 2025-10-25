import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Plus, MapPin, DollarSign, Clock, Users, Loader2, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Adventure, Invitation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";



export default function AdventuresPage() {
  const [, setLocation] = useLocation();

  const { data: adventures = [], isLoading: loadingAdventures } = useQuery<Adventure[]>({
    queryKey: ["/api/adventures"],
  });

  const { data: invitations = [], isLoading: loadingInvitations } = useQuery<(Invitation & { adventure: Adventure })[]>({
    queryKey: ["/api/invitations"],
  });
  const { toast } = useToast();

  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/invitations/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/adventures"] });
      toast({
        title: "Success",
        description: "Invitation updated!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const now = new Date();

  const upcomingAdventures = adventures
    .filter((a) => {
      const isUpcoming = !a.date || new Date(a.date) >= now;
      if (!isUpcoming) return false;

      // If there's an invitation for this adventure, and it has a status,
      // only include the adventure when that status is "Accepted".
      const inv = invitations.find(
        (i: any) =>
          (i.adventure && i.adventure.id === a.id) ||
          // fallback if invitation stores adventureId separately
          (i.adventureId && i.adventureId === a.id)
      );

      if (!inv) return true; // no invitation => include
      // if invitation exists but no status field, include; otherwise require "Accepted"
      return inv.status ? inv.status === "Accepted" : true;
    })
    .sort((a, b) => {
      // Put dated adventures first, sorted by date ascending. Undated go last.
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const pastAdventures = adventures.filter((a) => a.date && new Date(a.date) < now);
  const pendingInvitations = invitations.filter((i) => i.status === "Pending");
  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Adventures
          </h1>
          <Button
            size="icon"
            onClick={() => setLocation("/adventures/create")}
            data-testid="button-create-adventure"
            className="rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              Invitations
              {pendingInvitations.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingInvitations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {loadingAdventures ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingAdventures.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Adventures Planned"
                description="Create your first adventure and invite friends to join you in completing experiences together."
                actionLabel="Plan Adventure"
                onAction={() => setLocation("/adventures/create")}
              />
            ) : (
              <div className="space-y-4">
                {upcomingAdventures.map((adventure: any) => (
                  <Card key={adventure.id} className="hover-elevate" data-testid={`card-adventure-${adventure.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Date block */}
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="bg-primary/10 rounded-lg p-2">
                            <Calendar className="h-6 w-6 text-primary mx-auto mb-1" />
                            {adventure.date && (
                              <div className="text-xs font-semibold">
                                {format(new Date(adventure.date), "MMM d")}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Adventure details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">{adventure.name}</h3>
                          
                          {adventure.place && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3 w-3" />
                              <span>{adventure.place}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                            {adventure.cost > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${adventure.cost}</span>
                              </div>
                            )}
                            {adventure.timeRequired > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{Math.floor(adventure.timeRequired / 60)}h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="mt-0">
            {loadingInvitations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingInvitations.map((invitation: any) => {
                  const adv = invitation.adventure ?? {};
                  return (
                    <Card key={invitation.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          {/* Date block */}
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="bg-primary/10 rounded-lg p-2">
                              <Calendar className="h-6 w-6 text-primary mx-auto mb-1" />
                              {adv.date && (
                                <div className="text-xs font-semibold">
                                  {format(new Date(adv.date), "MMM d")}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Adventure details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1">{adv.name}</h3>

                            {adv.place && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <MapPin className="h-3 w-3" />
                                <span>{adv.place}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                              {adv.cost > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>${adv.cost}</span>
                                </div>
                              )}
                              {adv.timeRequired > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{Math.floor(adv.timeRequired / 60)}h</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              size="icon"
                              variant="default"
                              onClick={() => respondToInvitationMutation.mutate({ id: invitation.id, status: "Accepted" })}
                              disabled={respondToInvitationMutation.isPending}
                              data-testid={`button-accept-invitation-${invitation.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => respondToInvitationMutation.mutate({ id: invitation.id, status: "Declined" })}
                              disabled={respondToInvitationMutation.isPending}
                              data-testid={`button-decline-invitation-${invitation.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {loadingAdventures ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pastAdventures.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past adventures</p>
                <p className="text-sm mt-1">Your completed adventures will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastAdventures.map((adventure: any) => (
                  <Card key={adventure.id} className="opacity-75">
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{adventure.name}</h3>
                      {adventure.date && (
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(adventure.date), "MMMM d, yyyy")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
