import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({
  variant = "info",
  title,
  icon,
  children,
  className,
  ...props
}: AlertProps) {
  const variantStyles = {
    info: "bg-neutral-50 text-neutral-800 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
    error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800",
  };

  const defaultIcons = {
    info: <Info className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    error: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-xs tracking-wide leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="shrink-0 mt-0.5">{icon || defaultIcons[variant]}</div>
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-1 uppercase tracking-wider">{title}</h5>}
        <div className="text-xs opacity-90">{children}</div>
      </div>
    </div>
  );
}
