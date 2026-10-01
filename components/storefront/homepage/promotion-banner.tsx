import * as React from "react";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionDeal } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";

export interface PromotionBannerProps {
  promotion?: PromotionDeal;
}

export function PromotionBanner({
  promotion = HOMEPAGE_DATA.promotion,
}: PromotionBannerProps) {
  if (!promotion) {
    return null;
  }

  return (
    <section aria-label="Promotional Offers" className="container mx-auto px-4 py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 p-8 sm:p-12 text-white border border-neutral-800 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 text-center md:text-left">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400">
              <Tag className="h-3.5 w-3.5" />
              <span>{promotion.badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-light tracking-wide text-white">
              {promotion.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
              {promotion.description}
            </p>
            {promotion.discountNote && (
              <span className="inline-block text-[11px] font-mono text-amber-300/90 font-medium">
                {promotion.discountNote}
              </span>
            )}
          </div>

          <div className="shrink-0">
            <Link href={promotion.ctaHref}>
              <Button
                size="lg"
                variant="primary"
                className="bg-amber-100 text-neutral-950 hover:bg-white font-medium text-xs tracking-widest h-11 px-7 transition-all"
              >
                {promotion.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
