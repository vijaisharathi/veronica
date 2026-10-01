import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-neutral-950 text-white">
      {/* Background Image Container with Gradient Overlay */}
      <div className="relative min-h-[580px] sm:min-h-[680px] lg:min-h-[760px] w-full flex items-center">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
          alt="VÉRONA Haute Couture Spring/Summer Campaign"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
          loading="eager"
        />

        {/* Ambient Dark Gradient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/30" />

        {/* Hero Copy Content */}
        <div className="container relative z-10 mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3.5 py-1 text-[11px] font-mono tracking-widest text-amber-300 uppercase backdrop-blur-sm">
              <span>Runway Drop • Spring / Summer 2026</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light tracking-tight leading-[1.08] text-balance">
              Everyday. <br />
              <span className="italic font-normal text-amber-200">Elevated.</span>
            </h1>

            <p className="max-w-lg text-xs sm:text-sm text-neutral-300 leading-relaxed font-light tracking-wide">
              An architectural balance of raw textures, structured tailoring, and fluid mulberry silks. Curated for the modern Indian connoisseur.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/shop?gender=men">
                <Button size="lg" variant="primary" className="bg-white text-neutral-950 hover:bg-neutral-100 font-semibold tracking-widest">
                  Shop Men <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/shop?gender=women">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-neutral-950 tracking-widest">
                  Shop Women
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
