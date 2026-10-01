import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export interface HomepageEmptyStateProps {
  title?: string;
  message?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function HomepageEmptyState({
  title = "No Items Currently Available",
  message = "Our ateliers are currently curating new archival pieces for this collection. Explore our latest arrivals in the meantime.",
  ctaText = "Shop New Arrivals",
  ctaHref = ROUTES.NEW_ARRIVALS,
}: HomepageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-neutral-50/50 dark:bg-neutral-900/20 max-w-xl mx-auto my-8 space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-subtle border border-border">
        <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-serif font-normal text-foreground uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed font-light">
          {message}
        </p>
      </div>
      <div className="pt-2">
        <Link href={ctaHref}>
          <Button size="sm" variant="primary" className="text-xs tracking-widest font-semibold">
            {ctaText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
