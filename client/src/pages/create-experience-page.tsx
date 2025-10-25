import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { ArrowLeft, Upload } from "lucide-react";
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

export default function CreateExperiencePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string>("");

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

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/experiences", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      toast({
        title: "Success",
        description: "Experience created successfully!",
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

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({ ...data, photoUrl });
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
              <div className="aspect-[16/9] bg-muted rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate border-2 border-dashed border-border">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload photo</p>
                <p className="text-xs text-muted-foreground">Coming soon with photo upload</p>
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

              {/* Place */}
              <div className="space-y-2">
                <Label htmlFor="place">Place</Label>
                <Input
                  id="place"
                  placeholder="Where is this experience?"
                  {...form.register("place")}
                  data-testid="input-experience-place"
                  className="h-12"
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
                <Input
                  id="recommendedBy"
                  placeholder="Who recommended this?"
                  {...form.register("recommendedBy")}
                  data-testid="input-experience-recommended-by"
                  className="h-12"
                />
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
