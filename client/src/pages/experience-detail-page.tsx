import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, MapPin, DollarSign, Clock, Trash2, Loader2 } from "lucide-react";
import { Experience, ExperienceStatus, Adventure } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  Received: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  NextUp: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  InProgress: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Completed: "bg-green-500/10 text-green-700 dark:text-green-300",
};

export default function ExperienceDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: experience, isLoading } = useQuery<Experience>({
    queryKey: ["/api/experiences", id],
    queryFn: async () => {
      const response = await fetch(`/api/experiences/${id}`);
      if (!response.ok) throw new Error("Failed to fetch experience");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("PATCH", `/api/experiences/${id}`, {
        status: newStatus,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", id] });
      toast({
        title: "Success",
        description: "Status updated successfully!",
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

  // Fetch any adventure already created for this experience
  const { data: adventuresForExperience } = useQuery<Adventure[]>({
    queryKey: ["/api/adventures", "byExperience", id],
    queryFn: async () => {
      const resp = await fetch(`/api/adventures?experienceId=${id}`);
      if (!resp.ok) return [];
      return resp.json();
    },
    enabled: !!id,
  });

  const existingAdventure = adventuresForExperience && adventuresForExperience.length > 0 ? adventuresForExperience[0] : null;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/experiences/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      toast({
        title: "Success",
        description: "Experience deleted successfully!",
      });
      setLocation("/experiences");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Experience not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/experiences")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1" style={{ fontFamily: "var(--font-heading)" }}>
            Experience
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-delete"
          >
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Photo */}
        {experience.photoUrl && (
          <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted">
            <img 
              src={experience.photoUrl} 
              alt={experience.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{experience.name}</h2>
                <Badge className={statusColors[experience.status as keyof typeof statusColors]}>
                  {experience.status}
                </Badge>
              </div>
            </div>

            {experience.description && (
              <p className="text-muted-foreground mb-4">{experience.description}</p>
            )}

            {/* Details */}
            <div className="space-y-3 text-sm">
              {experience.place && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{experience.place}</span>
                </div>
              )}
              
              {experience.moneyNeeded && experience.moneyNeeded > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${experience.moneyNeeded}</span>
                </div>
              )}

              {experience.timeRequired && experience.timeRequired > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{Math.floor(experience.timeRequired / 60)}h {experience.timeRequired % 60}m</span>
                </div>
              )}

              {experience.recommendedBy && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Recommended by</p>
                  <p className="font-medium">{experience.recommendedBy}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Workflow */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Update Status</h3>
            <Select
              value={experience.status}
              onValueChange={(value) => updateStatusMutation.mutate(value)}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="h-12" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ExperienceStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Track your progress through each stage of your experience journey
            </p>
          </CardContent>
        </Card>

        {/* If an adventure already exists for this experience, show it */}
        {existingAdventure ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Adventure</h3>
                  <p className="font-medium">{existingAdventure.name}</p>
                  <div className="text-sm text-muted-foreground mt-2">
                    {existingAdventure.place && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{existingAdventure.place}</span>
                      </div>
                    )}
                    {existingAdventure.date && (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(existingAdventure.date), "PPP")}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => setLocation(`/adventures/${existingAdventure.id}`)}
                    data-testid="button-open-adventure"
                  >
                    Open
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Create Adventure */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold">Create Adventure</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Turn this experience into an adventure.
              </p>
            </div>
            <div>
              <Button
                onClick={() => setLocation(`/adventures/create?experienceId=${id}`)}
                data-testid="button-create-adventure"
              >
                Create Adventure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Opinion (if completed) */}
        {experience.status === "Completed" && experience.opinion && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">My Review</h3>
              <p className="text-muted-foreground">{experience.opinion}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
