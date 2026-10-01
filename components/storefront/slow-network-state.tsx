import * as React from "react";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface SlowNetworkStateProps {
  message?: string;
  className?: string;
}

export function SlowNetworkState({
  message = "Tailoring silhouettes over a slower network connection...",
  className = "",
}: SlowNetworkStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`border border-border/80 p-6 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/40 text-center max-w-md mx-auto space-y-4 ${className}`}
    >
      <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-wider text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin" />
        <span>{message}</span>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-3 w-1/2 mx-auto" />
      </div>
    </div>
  );
}
