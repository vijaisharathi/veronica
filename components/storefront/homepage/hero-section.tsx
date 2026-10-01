import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCampaign } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";

export interface HeroSectionProps {
  campaign?: HeroCampaign;
}

export function HeroSection({ campaign = HOMEPAGE_DATA.hero }: HeroSectionProps) {
  return (
    <section
      aria-label="Featured Fashion Campaign"
      className="relative w-full overflow-hidden bg-neutral-950 text-white"
    >
      {/* Background Image Container with Gradient Overlay */}
      <div className="relative min-h-[580px] sm:min-h-[680px] lg:min-h-[760px] w-full flex items-center">
        {/* Optimized Desktop/Responsive Hero Image */}
        <Image
          src={campaign.image}
          alt="VÉRONA Runway Collection Spring Summer Campaign"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-70"
        />

        {/* Ambient Dark Gradient Overlays for High-Contrast Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/40" />

        {/* Hero Narrative Content */}
        <div className="container relative z-10 mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-2xl space-y-6">
            {/* Eyebrow / Drop Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3.5 py-1 text-[10px] sm:text-[11px] font-mono tracking-widest text-amber-300 uppercase backdrop-blur-sm">
              <span>{campaign.eyebrow}</span>
            </div>

            {/* Single Primary H1 */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light tracking-tight leading-[1.06] text-balance">
              {campaign.title} <br />
              {campaign.titleAccent && (
                <span className="italic font-normal text-amber-200">
                  {campaign.titleAccent}
                </span>
              )}
            </h1>

            {/* Description */}
            <p className="max-w-lg text-xs sm:text-sm text-neutral-300 leading-relaxed font-light tracking-wide">
              {campaign.description}
            </p>

            {/* Dual CTAs (Shop Women / Shop Men) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={campaign.primaryCta.href}>
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-white text-neutral-950 hover:bg-neutral-100 font-semibold tracking-widest text-xs h-12 px-7"
                >
                  {campaign.primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {campaign.secondaryCta && (
                <Link href={campaign.secondaryCta.href}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-neutral-950 tracking-widest text-xs h-12 px-7"
                  >
                    {campaign.secondaryCta.label}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
