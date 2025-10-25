import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, Controller} from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Check, X, Users, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Experience } from "@shared/schema";
import { insertAdventureSchema } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const formSchema = insertAdventureSchema.extend({
  name: z.string().min(1, "Name is required"),
  date: z.date(),
  hostId: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateAdventurePage() {
  const [, setLocation] = useLocation();
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showFriendsList, setShowFriendsList] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
  });

  const getSelectedFriendsData = () => {
    return friends.filter(friend => selectedFriends.has(friend.id));
  };
  
  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      experienceId: "",
      hostId: "",
      place: "",
      date: undefined,
      cost: 0,
      timeRequired: 0,
    },
  });

  // Fetch experiences list for the select dropdown
  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
    queryFn: async () => {
      const res = await fetch("/api/experiences");
      if (!res.ok) throw new Error("Failed to fetch experiences");
      return res.json();
    },
  });

  // Update hostId when user loads
  useEffect(() => {
    if (user?.id) {
      form.setValue("hostId", user.id);
    }
  }, [user, form]);

  // Parse experienceId from query param and prefill fields when available.
  // Use window.location.search which is more reliable for query params than
  // splitting the wouter location string.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const experienceId = params.get("experienceId");
      if (!experienceId) return;

      // If experiences are loaded, find it and prefill
      if (experiences) {
        const found = experiences.find((e) => e.id === experienceId);
        if (found) {
          form.setValue("experienceId", found.id ?? "");
          form.setValue("name", found.name ?? "");
          form.setValue("place", found.place ?? "");
          form.setValue("cost", found.moneyNeeded ?? 0);
          // convert minutes to hours for the hours input
          const hours = found.timeRequired ? found.timeRequired / 60 : 0;
          form.setValue("timeRequired", Math.round(hours * 2) / 2);
        } else {
          // set the id anyway if the experience isn't in the initial list
          form.setValue("experienceId", experienceId);
        }
      } else {
        // experiences not loaded yet; set id so the select will update once loaded
        form.setValue("experienceId", experienceId);
      }
    } catch (e) {
      // ignore malformed URLSearchParams errors
    }
    // run when experiences load or on mount
  }, [experiences, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const dateString = data.date ? data.date.toISOString() : null;
      const response = await apiRequest("POST", "/api/adventures", {
        ...data,
        date: dateString,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/adventures"] });
      toast({
        title: "Success",
        description: "Adventure created successfully!",
      });
      setLocation("/adventures");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/friends/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({
        title: "Success",
        description: "Request updated!",
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
  

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            // onClick={() => setLocation("/adventures")}
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Plan Adventure
          </h1>
        </div>
      </header>

      {/* Form */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Experience select */}
              <div className="space-y-2">
                <Label htmlFor="experience">From Experience</Label>
                <Controller
                  name="experienceId"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const selected = experiences?.find((e) => e.id === val);
                        if (selected) {
                          form.setValue("name", selected.name ?? "");
                          form.setValue("place", selected.place ?? "");
                          form.setValue("cost", selected.moneyNeeded ?? 0);
                          form.setValue("timeRequired", selected.timeRequired ? selected.timeRequired / 60 : 0);
                        }
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select an experience (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">None</SelectItem>
                        {experiences?.map((exp) => (
                          <SelectItem key={exp.id} value={exp.id}>
                            {exp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Adventure Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekend hiking trip"
                  {...form.register("name")}
                  data-testid="input-adventure-name"
                  className="h-12"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Place */}
              <div className="space-y-2">
                <Label htmlFor="place">Location</Label>
                <Input
                  id="place"
                  placeholder="Where will this adventure take place?"
                  {...form.register("place")}
                  data-testid="input-adventure-place"
                  className="h-12"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Controller
                    name="date" // This field name MUST match your formSchema
                    control={form.control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-start text-left font-normal"
                                    data-testid="button-select-date"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {/* Use RHF's field.value (which is a Date object) */}
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    // Pass RHF's value and onChange handlers
                                    selected={field.value ?? undefined}
                                    onSelect={field.onChange} // Connects selection back to RHF state
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                {form.formState.errors.date && (
                    <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                )}
            </div>

              {/* Cost and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register("cost", { valueAsNumber: true })}
                    data-testid="input-adventure-cost"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeRequired">Duration (hours)</Label>
                  <Input
                    id="timeRequired"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    {...form.register("timeRequired", { 
                      valueAsNumber: true,
                      setValueAs: (v) => v ? v * 60 : 0
                    })}
                    data-testid="input-adventure-time"
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Friends Display */}
          <Card>
          <CardContent className="p-6">
            <Label className="block mb-3">Invite Friends</Label>
              {selectedFriends.size > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {getSelectedFriendsData().map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(friend.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{friend.username}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                          onClick={() => toggleFriend(friend.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show/Hide Friends List */}
              {!showFriendsList ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFriendsList(true)}
                  className="w-full h-12"
                  data-testid="button-show-friends"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {selectedFriends.size > 0 
                    ? `Selected ${selectedFriends.size} friend(s) - Add more` 
                    : "Select friends to join the Adventure"
                  }
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select friends to invite to this adventure:</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFriendsList(false)}
                    >
                      Done
                    </Button>
                  </div>
                  
                  {loadingFriends ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No friends found</p>
                      <p className="text-xs">Add friends to share adventures!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {friends.map((friend) => {
                        const isSelected = selectedFriends.has(friend.id);
                        return (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-primary/10 border-primary border" 
                                : "bg-muted/50 hover:bg-muted border border-transparent"
                            }`}
                            onClick={() => toggleFriend(friend.id)}
                            data-testid={`friend-option-${friend.id}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-sm">
                                {getInitials(friend.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{friend.username}</p>
                            </div>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                Selected friends will receive an invite for this Adventure after it's created.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setLocation("/adventures")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12"
              disabled={createMutation.isPending}
              data-testid="button-save-adventure"
            >
              {createMutation.isPending ? "Creating..." : "Create Adventure"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
