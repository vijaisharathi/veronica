"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id: string;
  type?: ToastType;
  title: string;
  description?: string;
  onDismiss: (id: string) => void;
}

export function Toast({
  id,
  type = "info",
  title,
  description,
  onDismiss,
}: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
  };

  return (
    <div
      role="status"
      className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-elevated dark:bg-neutral-900 animate-slide-down"
    >
      {icons[type]}
      <div className="flex-1">
        <h6 className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h6>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="rounded p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
