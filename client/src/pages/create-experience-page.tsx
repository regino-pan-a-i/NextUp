import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, X, Users, Loader2 } from "lucide-react";
import { ExperienceCategory, ExperienceStatus, insertExperienceSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlaceSearch } from "@/components/place-search-page";

const formSchema = insertExperienceSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.enum(Object.keys(ExperienceCategory) as [string, ...string[]]),
  status: z.enum(Object.keys(ExperienceStatus) as [string, ...string[]]).default("Pending"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateExperiencePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null); 

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "Food",
      place: "",
      moneyNeeded: 0,
      timeRequired: 0,
      status: "Pending",
      opinion: "",
      photoUrl: "",
      recommendedBy: "",
    },
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: showFriendsList,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      
      const placeData = selectedPlace ? {
        placeId: selectedPlace.place_id,
        placeAddress: selectedPlace.formatted_address,
        placeRating: selectedPlace.rating,
        placePhotoUrl: selectedPlace.photos?.[0]?.photo_reference ? 
          `/api/places/photo?photo_reference=${selectedPlace.photos[0].photo_reference}&maxwidth=400` : null,
      } : {};

      const response = await apiRequest("POST", "/api/experiences", { 
        ...data, 
        photoUrl,
        ...placeData 
      });
      return response.json();
    },
    onSuccess: async (newExperience) => {
      // Send recommendations to selected friends
      if (selectedFriends.size > 0) {
        const recommendationPromises = Array.from(selectedFriends).map(friendId =>
          apiRequest("POST", "/api/recommendations", {
            toUserId: friendId,
            experienceId: newExperience.id,
          })
        );

        try {
          await Promise.all(recommendationPromises);
          toast({
            title: "Success",
            description: `Experience created and recommended to ${selectedFriends.size} friend(s)!`,
          });
        } catch (error) {
          toast({
            title: "Partial Success",
            description: "Experience created but some recommendations failed to send.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Experience created successfully!",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
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

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({ ...data, photoUrl });
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

  const getSelectedFriendsData = () => {
    return friends.filter(friend => selectedFriends.has(friend.id));
  };

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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Add Experience
          </h1>
        </div>
      </header>

      {/* Form */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo upload */}
          <Card>
            <CardContent className="p-6">
              <Label className="block mb-3 text-sm font-medium">Photo (Optional)</Label>
              <div
                className="aspect-[16/9] bg-muted rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate border-2 border-dashed border-border overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
                data-testid="photo-dropzone"
              >
                {photoUrl ? (
                  // preview via internal objects route
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="preview" className="object-cover w-full h-full" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload photo</p>
                    <p className="text-xs text-muted-foreground">Click to select a file</p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      const resp = await apiRequest("POST", "/api/objects/upload");
                      const body = await resp.json();
                      const uploadURL: string = body.uploadURL;
                      const objectPath: string = body.objectPath;

                      const putResp = await fetch(uploadURL, {
                        method: "PUT",
                        headers: {
                          "Content-Type": f.type || "application/octet-stream",
                        },
                        body: f,
                      });

                      if (!putResp.ok) throw new Error("Upload failed");

                      setPhotoUrl(objectPath);
                    } catch (err: any) {
                      console.error("Upload error:", err);
                      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
                    } finally {
                      setUploading(false);
                    }
                  }}
                />

                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Experience Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Try authentic ramen in Tokyo"
                  {...form.register("name")}
                  data-testid="input-experience-name"
                  className="h-12"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What makes this experience special?"
                  rows={3}
                  {...form.register("description")}
                  data-testid="input-experience-description"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value as any)}
                >
                  <SelectTrigger className="h-12" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ExperienceCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div className="space-y-2">
                <Label htmlFor="place">Place</Label>
                <PlaceSearch
                  value={form.watch("place") || ""}
                  onPlaceSelect={(place) => {
                    setSelectedPlace(place);
                    form.setValue("place", place?.name || "");
                  }}
                  placeholder="Search for a place or location..."
                />
              </div>

              {/* Money and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneyNeeded">Cost ($)</Label>
                  <Input
                    id="moneyNeeded"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register("moneyNeeded", { valueAsNumber: true })}
                    data-testid="input-experience-cost"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeRequired">Time (minutes)</Label>
                  <Input
                    id="timeRequired"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register("timeRequired", { valueAsNumber: true })}
                    data-testid="input-experience-time"
                    className="h-12"
                  />
                </div>
              </div>

              {/* Recommended by */}
              <div className="space-y-2">
                <Label htmlFor="recommendedBy">Recommended by</Label>
                <Select
                  value={(form.watch("recommendedBy") ?? "") as string}
                  onValueChange={(value) => form.setValue("recommendedBy", value as any)}
                >
                  <SelectTrigger className="h-12" data-testid="select-recommended-by">
                    <SelectValue placeholder="Select a friend" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Allow explicit none */}
                    <SelectItem value="NONE">None</SelectItem>
                    {loadingFriends ? (
                      <SelectItem value="NONE" disabled>
                        Loading...
                      </SelectItem>
                    ) : friends.length === 0 ? (
                      <SelectItem value="NONE" disabled>
                        No friends
                      </SelectItem>
                    ) : (
                      friends.map((f: any) => (
                        <SelectItem key={f.id ?? f.name ?? f} value={String(f.username)}>
                          {f.username}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger className="h-12" data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ExperienceStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selected Friends Display */}
          <Card>
          <CardContent className="p-6">
            <Label className="block mb-3">Send to a Friend</Label>
              {selectedFriends.size > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {getSelectedFriendsData().map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <Avatar className="h-6 w-6">
                          {friend.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.photoUrl} alt={friend.username} className="object-cover w-full h-full rounded-full" />
                          ) : (
                            <AvatarFallback className="text-xs">{getInitials(friend.username)}</AvatarFallback>
                          )}
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
                    : "Select Friends to Recommend"
                  }
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select friends to recommend this experience:</p>
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
                      <p className="text-xs">Add friends to start sharing experiences!</p>
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
                Selected friends will receive a recommendation for this experience after it's created.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setLocation("/experiences")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12"
              disabled={createMutation.isPending}
              data-testid="button-save-experience"
            >
              {createMutation.isPending ? "Saving..." : "Save Experience"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}