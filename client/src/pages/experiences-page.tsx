import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ExperienceCard } from "@/components/experience-card";
import { Button } from "@/components/ui/button";
import { Plus, Compass, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { ExperienceCategory, Experience } from "@shared/schema";

export default function ExperiencesPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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

  const categories = ["All", ...Object.values(ExperienceCategory)];

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
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : experiences.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Start Your Bucket List"
            description="Add your first experience to begin tracking the things you want to try, places to visit, and memories to make."
            actionLabel="Add Experience"
            onAction={() => setLocation("/experiences/create")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
