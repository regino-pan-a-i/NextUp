import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertAdventureSchema } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertAdventureSchema.extend({
  name: z.string().min(1, "Name is required"),
  date: z.date().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditAdventurePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adventure, isLoading } = useQuery({
    queryKey: ["/api/adventures", id],
    queryFn: async () => {
      const res = await fetch(`/api/adventures/${id}`);
      if (!res.ok) throw new Error("Failed to fetch adventure");
      return res.json();
    },
    enabled: !!id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      experienceId: "",
      hostId: "",
      place: "",
      date: undefined as any,
      cost: 0,
      timeRequired: 0,
    },
  });

  useEffect(() => {
    if (adventure) {
      form.reset({
        name: adventure.name ?? "",
        experienceId: adventure.experienceId ?? "",
        hostId: adventure.hostId ?? "",
        place: adventure.place ?? "",
        date: adventure.date ? new Date(adventure.date) : undefined,
        cost: adventure.cost ?? 0,
        timeRequired: adventure.timeRequired ?? 0,
      });
    }
  }, [adventure]);

  const editMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const dateString = data.date ? data.date.toISOString() : null;
      const response = await apiRequest("PATCH", `/api/adventures/${id}`, {
        ...data,
        date: dateString,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/adventures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/adventures", id] });
      toast({ title: "Success", description: "Adventure updated" });
      setLocation(`/adventures/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = async (data: FormData) => {
    await editMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else setLocation(`/adventures/${id}`);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Edit Adventure
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Adventure Name *</Label>
                <Input id="name" {...form.register("name")} className="h-12" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Controller
                  name="date"
                  control={form.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="place">Location</Label>
                <Input id="place" {...form.register("place")} className="h-12" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated Cost ($)</Label>
                  <Input id="cost" type="number" {...form.register("cost", { valueAsNumber: true })} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeRequired">Duration (hours)</Label>
                  <Input id="timeRequired" type="number" step="0.5" {...form.register("timeRequired", { valueAsNumber: true })} className="h-12" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setLocation(`/adventures/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
