import { ExperienceStatus } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: keyof typeof ExperienceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    Received: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    Pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
    NextUp: "bg-primary/10 text-primary border-primary/20",
    InProgress: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    Completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-bold uppercase px-2 py-1 ${colors[status]}`}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {status}
    </Badge>
  );
}
