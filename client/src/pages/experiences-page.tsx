import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ExperienceCard } from "@/components/experience-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Compass, Loader2, Heart, MapPin, DollarSign, Clock, Check, X, Gift } from "lucide-react";
import { useLocation } from "wouter";
import { ExperienceCategory, Experience } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  status: "Pending" | "Accepted" | "Declined";
  createdAt: string;
  fromUser: {
    id: string;
    username: string;
  };
  experience: {
    id: string;
    name: string;
    description?: string;
    category: string;
    place?: string;
    moneyNeeded?: number;
    timeRequired?: number;
    photoUrl?: string;
  };
}

const categoryColors = {
  Food: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Movies: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Books: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Places: "bg-green-500/10 text-green-700 dark:text-green-300",
  Music: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  Activities: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  Other: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

export default function ExperiencesPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { toast } = useToast();

  const { data: experiences = [], isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") {
        params.append("category", selectedCategory);
      }
      const response = await fetch(`/api/experiences?${params}`);
      if (!response.ok) throw new Error("Failed to fetch experiences");
      return response.json();
    },
  });

  // Query para las recomendaciones completas
  const { data: recommendations = [], isLoading: loadingRecommendations } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const categories = ["All", ...Object.values(ExperienceCategory)];

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Accepted" | "Declined" }) => {
      const response = await apiRequest("PATCH", `/api/recommendations/${id}`, { status });
      return response.json();
    },
    onSuccess: async (_, { status }) => {
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      
      // Force refetch of experiences for all categories
      categories.forEach(category => {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/experiences", category === "All" ? selectedCategory : category] 
        });
      });
      
      toast({
        title: "Success",
        description: status === "Accepted" 
          ? "Experience added to your list!" 
          : "Recommendation declined",
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
  
  // Filtrar experiencias por status
  const upcomingExperiences = experiences.filter(exp => 
    exp.status === "Pending" || exp.status === "NextUp" || exp.status === "InProgress"
  );
  const pastExperiences = experiences.filter(exp => exp.status === "Completed");
  const pendingRecommendations = recommendations.filter(rec => rec.status === "Pending");

  // Debug: Log para ver qué experiencias tenemos
  console.log("All experiences:", experiences);
  console.log("Upcoming experiences:", upcomingExperiences);
  console.log("Selected category:", selectedCategory);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              Experiences
            </h1>
            <Button
              size="icon"
              onClick={() => setLocation("/experiences/create")}
              data-testid="button-add-experience"
              className="rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-category-${category.toLowerCase()}`}
                className="rounded-full whitespace-nowrap flex-shrink-0"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="flex w-full  mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              Recommendations
              {pendingRecommendations.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingRecommendations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingExperiences.length === 0 ? (
              <EmptyState
                icon={Compass}
                title="Start Your Bucket List"
                description="Add your first experience to begin tracking the things you want to try, places to visit, and memories to make."
                actionLabel="Add Experience"
                onAction={() => setLocation("/experiences/create")}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingExperiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="mt-0">
            {loadingRecommendations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="No Recommendations Yet"
                description="When friends recommend experiences to you, they'll appear here for you to review and add to your list."
              />
            ) : (
              <div className="space-y-4">
                {/* Show pending recommendations first */}
                {pendingRecommendations.map((recommendation) => (
                  <Card key={recommendation.id} className="hover-elevate border-primary/20">
                    <CardContent className="p-0">
                      {/* Photo */}
                      {recommendation.experience.photoUrl && (
                        <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg">
                          <img 
                            src={recommendation.experience.photoUrl} 
                            alt={recommendation.experience.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="p-4">
                        {/* Header with user info and status */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(recommendation.fromUser.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{recommendation.fromUser.username}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(recommendation.createdAt)}
                              </p>
                            </div>
                          </div>
                          
                          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                            New
                          </Badge>
                        </div>

                        {/* Experience details */}
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Heart className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-1">
                                {recommendation.experience.name}
                              </h3>
                              <Badge 
                                className={`${categoryColors[recommendation.experience.category as keyof typeof categoryColors]} text-xs`}
                              >
                                {recommendation.experience.category}
                              </Badge>
                              {recommendation.experience.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {recommendation.experience.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Experience metadata */}
                          {(recommendation.experience.place || recommendation.experience.moneyNeeded || recommendation.experience.timeRequired) && (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {recommendation.experience.place && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{recommendation.experience.place}</span>
                                </div>
                              )}
                              
                              {recommendation.experience.moneyNeeded && recommendation.experience.moneyNeeded > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>${recommendation.experience.moneyNeeded}</span>
                                </div>
                              )}

                              {recommendation.experience.timeRequired && recommendation.experience.timeRequired > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{Math.floor(recommendation.experience.timeRequired / 60)}h {recommendation.experience.timeRequired % 60}m</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => respondMutation.mutate({ 
                              id: recommendation.id, 
                              status: "Declined" 
                            })}
                            disabled={respondMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => respondMutation.mutate({ 
                              id: recommendation.id, 
                              status: "Accepted" 
                            })}
                            disabled={respondMutation.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Add to My List
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Show processed recommendations with less prominence */}
                {recommendations.filter(rec => rec.status !== "Pending").length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs text-muted-foreground px-3">Previous</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>
                    
                    <div className="space-y-2">
                      {recommendations
                        .filter(rec => rec.status !== "Pending")
                        .slice(0, 3) // Solo mostrar las 3 más recientes
                        .map((recommendation) => (
                          <Card key={recommendation.id} className="opacity-60">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(recommendation.fromUser.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{recommendation.experience.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      by {recommendation.fromUser.username}
                                    </p>
                                  </div>
                                </div>
                                <Badge 
                                  variant={recommendation.status === "Accepted" ? "default" : "secondary"}
                                  className={recommendation.status === "Accepted" 
                                    ? "bg-green-500/10 text-green-700 dark:text-green-300" 
                                    : "bg-red-500/10 text-red-700 dark:text-red-300"
                                  }
                                >
                                  {recommendation.status}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pastExperiences.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No completed experiences yet</p>
                <p className="text-sm mt-1">Complete your first experience to see it here</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastExperiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
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