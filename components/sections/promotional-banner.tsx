import * as React from "react";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PromotionalBanner() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 p-8 sm:p-12 text-white border border-neutral-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 text-center md:text-left">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400">
              <Tag className="h-3.5 w-3.5" />
              <span>Privileged Access</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-light tracking-wide">
              The Mid-Season Private Archive
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Enjoy complimentary garment customisation and up to 40% off selected runway silhouettes.
            </p>
          </div>

          <div className="shrink-0">
            <Link href="/shop?sale=true">
              <Button size="lg" variant="primary" className="bg-amber-100 text-neutral-950 hover:bg-white font-medium text-xs tracking-widest">
                Explore Private Archive <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
