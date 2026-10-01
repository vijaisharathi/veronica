import * as React from "react";
import { RotateCcw, ShieldCheck, Truck, Sparkles, Headphones } from "lucide-react";
import { TrustBenefit } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";

export interface TrustBenefitsProps {
  benefits?: TrustBenefit[];
}

export function TrustBenefits({
  benefits = HOMEPAGE_DATA.trustBenefits,
}: TrustBenefitsProps) {
  if (!benefits || benefits.length === 0) {
    return null;
  }

  const getIcon = (name: TrustBenefit["iconName"]) => {
    switch (name) {
      case "returns":
        return <RotateCcw className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      case "shield":
        return <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      case "truck":
        return <Truck className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      case "sparkles":
        return <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      case "headphones":
        return <Headphones className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      default:
        return <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
    }
  };

  return (
    <section
      aria-label="Shopping Benefits & Assurances"
      className="container mx-auto px-4 py-14 sm:py-18 border-t border-b border-border/70 my-10"
    >
      <div className="text-center max-w-xl mx-auto mb-10 space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block font-medium">
          The VÉRONA Standard
        </span>
        <h2 className="text-xl sm:text-2xl font-serif font-light uppercase tracking-wider text-foreground">
          Commerce Built on Trust & Distinction
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
        {benefits.map((benefit) => (
          <div
            key={benefit.id}
            className="flex flex-col items-center text-center p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-border/50 space-y-3 transition-colors hover:border-border"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-border/50">
              {getIcon(benefit.iconName)}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {benefit.title}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-light">
                {benefit.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
