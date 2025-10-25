import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlaceSearch } from "@/components/place-search-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { ExperienceCategory, ExperienceStatus, insertExperienceSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertExperienceSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.enum(Object.keys(ExperienceCategory) as [string, ...string[]]),
  status: z.enum(Object.keys(ExperienceStatus) as [string, ...string[]]).default("Pending"),
});

type FormData = z.infer<typeof formSchema>;

export default function EditExperiencePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
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

  const { data: experience, isLoading } = useQuery({
    queryKey: ["/api/experiences", id],
    queryFn: async () => {
      const resp = await fetch(`/api/experiences/${id}`);
      if (!resp.ok) throw new Error("Failed to fetch experience");
      return resp.json();
    },
    enabled: !!id,
  });

  // When experience loads, populate form
  useEffect(() => {
    if (!experience) return;
    form.reset({
      name: experience.name ?? "",
      description: experience.description ?? "",
      category: experience.category ?? (Object.keys(ExperienceCategory)[0] as any),
      place: experience.place ?? "",
      moneyNeeded: experience.moneyNeeded ?? 0,
      timeRequired: experience.timeRequired ?? 0,
      status: experience.status ?? (Object.keys(ExperienceStatus)[0] as any),
      opinion: experience.opinion ?? "",
      photoUrl: experience.photoUrl ?? "",
      recommendedBy: experience.recommendedBy ?? "",
    });
    setPhotoUrl(experience.photoUrl ?? "");
    if (experience.place && experience.placeId) {
      setSelectedPlace({
        place_id: experience.placeId,
        name: experience.place,
        formatted_address: experience.placeAddress || "",
        rating: experience.placeRating,
        photos: experience.placePhotoUrl ? [{ photo_reference: experience.placePhotoUrl.split('photo_reference=')[1]?.split('&')[0] }] : [],
      });
    }
  }, [experience]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const placeData = selectedPlace ? {
        placeId: selectedPlace.place_id,
        placeAddress: selectedPlace.formatted_address,
        placeRating: selectedPlace.rating,
        placePhotoUrl: selectedPlace.photos?.[0]?.photo_reference ? 
          `/api/places/photo?photo_reference=${selectedPlace.photos[0].photo_reference}&maxwidth=400` : null,
      } : {
        // Si no hay lugar seleccionado, limpiar los datos
        placeId: null,
        placeAddress: null,
        placeRating: null,
        placePhotoUrl: null,
      };
      const resp = await apiRequest("PATCH", `/api/experiences/${id}`, { ...data, photoUrl, ...placeData });
      // const resp = await apiRequest("PATCH", `/api/experiences/${id}`, data);
      return resp.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", id] });
      toast({ title: "Success", description: "Experience updated" });
      setLocation(`/experiences/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = async (data: FormData) => {
    await updateMutation.mutateAsync({ ...data, photoUrl });
  };

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
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/experiences/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Edit Experience
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <Label className="block mb-3 text-sm font-medium">Photo (Optional)</Label>
              <div
                className="aspect-[16/9] bg-muted rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate border-2 border-dashed border-border overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
                data-testid="photo-dropzone"
              >
                {photoUrl ? (
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
                        headers: { "Content-Type": f.type || "application/octet-stream" },
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
              <div className="space-y-2">
                <Label htmlFor="name">Experience Name *</Label>
                <Input id="name" placeholder="Name" {...form.register("name")} className="h-12" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...form.register("description")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={form.watch("category")} onValueChange={(v) => form.setValue("category", v as any)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ExperienceCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="place">Place</Label>
                <Input id="place" {...form.register("place")} className="h-12" />
              </div> */}

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneyNeeded">Cost ($)</Label>
                  <Input id="moneyNeeded" type="number" {...form.register("moneyNeeded", { valueAsNumber: true })} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeRequired">Time (minutes)</Label>
                  <Input id="timeRequired" type="number" {...form.register("timeRequired", { valueAsNumber: true })} className="h-12" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendedBy">Recommended by</Label>
                <Input id="recommendedBy" {...form.register("recommendedBy")} className="h-12" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ExperienceStatus).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setLocation(`/experiences/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
