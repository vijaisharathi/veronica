import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  onRemove?: () => void;
  selected?: boolean;
}

export function Chip({
  className,
  label,
  onRemove,
  selected = false,
  ...props
}: ChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
        selected
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-border/80 dark:bg-neutral-800 dark:text-neutral-200",
        className
      )}
      {...props}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
          aria-label={`Remove filter ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
