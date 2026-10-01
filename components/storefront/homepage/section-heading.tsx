import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    isExternal?: boolean;
  };
  centered?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  centered = false,
  className = "",
}: SectionHeadingProps) {
  if (centered) {
    return (
      <div className={`text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2 ${className}`}>
        {eyebrow && (
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400 block font-medium">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light uppercase tracking-wider text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            {description}
          </p>
        )}
        {action && (
          <div className="pt-2">
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 underline underline-offset-4 transition-colors"
            >
              <span>{action.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 border-b border-border/70 pb-4 gap-4 ${className}`}
    >
      <div className="space-y-1">
        {eyebrow && (
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground block font-medium">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-serif font-light uppercase tracking-wider text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground font-light max-w-xl">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 inline-flex items-center gap-1.5 transition-colors group"
        >
          <span>{action.label}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
