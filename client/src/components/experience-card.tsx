import { Experience } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { CategoryBadge } from "./category-badge";
import { Clock, DollarSign, User } from "lucide-react";
import { Link } from "wouter";

interface ExperienceCardProps {
  experience: Experience;
}

export function ExperienceCard({ experience }: ExperienceCardProps) {
  const hasPhoto = !!experience.photoUrl;

  return (
    <Link href={`/experiences/${experience.id}`}>
      <a data-testid={`card-experience-${experience.id}`}>
        <Card className="overflow-hidden hover-elevate active-elevate-2 transition-transform duration-200 cursor-pointer h-full">
          {/* Image or gradient placeholder */}
          {hasPhoto ? (
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={experience.photoUrl ?? undefined}
                alt={experience.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute top-2 right-2">
                <StatusBadge status={experience.status} />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-xl font-semibold text-white mb-1 line-clamp-2">
                  {experience.name}
                </h3>
                <CategoryBadge category={experience.category} />
              </div>
            </div>
          ) : (
            <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute top-2 right-2">
                <StatusBadge status={experience.status} />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-xl font-semibold mb-1 line-clamp-2">
                  {experience.name}
                </h3>
                <CategoryBadge category={experience.category} />
              </div>
            </div>
          )}

          <CardContent className="p-4 space-y-3">
            {experience.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {experience.description}
              </p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {experience.timeRequired !== null && experience.timeRequired > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.floor(experience.timeRequired / 60)}h {experience.timeRequired % 60}m</span>
                </div>
              )}
              {experience.moneyNeeded !== null && experience.moneyNeeded > 0 && (
                <div className="flex items-center gap-1">
                  {/* <DollarSign className="h-3 w-3" /> */}
                  <span>${experience.moneyNeeded}</span>
                </div>
              )}
            </div>

            {experience.recommendedBy && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                <User className="h-3 w-3" />
                <span>Recommended by {experience.recommendedBy}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
