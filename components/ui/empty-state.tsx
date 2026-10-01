import * as React from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border/80 bg-neutral-50/50 dark:bg-neutral-900/30",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {icon || <PackageOpen className="h-6 w-6 stroke-[1.5]" />}
      </div>

      <h4 className="text-base font-serif font-medium tracking-wide text-foreground mb-1">
        {title}
      </h4>

      <p className="max-w-sm text-xs text-muted-foreground leading-relaxed mb-6">
        {description}
      </p>

      {actionLabel && (
        <div>
          {actionHref ? (
            <a href={actionHref}>
              <Button size="md" variant="primary">
                {actionLabel}
              </Button>
            </a>
          ) : (
            <Button size="md" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
