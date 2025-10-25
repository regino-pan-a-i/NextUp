import { ExperienceCategory } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Film, BookOpen, MapPin, Music, Sparkles } from "lucide-react";

interface CategoryBadgeProps {
  category: keyof typeof ExperienceCategory;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const icons = {
    Food: UtensilsCrossed,
    Movies: Film,
    Books: BookOpen,
    Places: MapPin,
    Music: Music,
    Activities: Sparkles,
    Other: Sparkles,
  };

  const Icon = icons[category];
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Badge
      variant="secondary"
      className={`${textSize} font-medium gap-1 rounded-full`}
      data-testid={`badge-category-${category.toLowerCase()}`}
    >
      <Icon className={iconSize} />
      {category}
    </Badge>
  );
}
