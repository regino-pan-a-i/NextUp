import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { insertAdventureSchema } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const formSchema = insertAdventureSchema.extend({
  name: z.string().min(1, "Name is required"),
  hostId: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateAdventurePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();

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

  // Update hostId when user loads
  useEffect(() => {
    if (user?.id) {
      form.setValue("hostId", user.id);
    }
  }, [user, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/adventures", {
        ...data,
        date: date ? date.toISOString() : null,
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
            onClick={() => setLocation("/adventures")}
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal"
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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

          {/* Friends section - coming soon */}
          <Card>
            <CardContent className="p-6">
              <Label className="block mb-3">Invite Friends</Label>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Friend invitations coming soon!</p>
                <p className="text-xs mt-1">You'll be able to invite friends after creating the adventure</p>
              </div>
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
