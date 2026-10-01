import * as React from "react";
import Link from "next/link";
import { ArrowRight, Scissors, Feather, HeartHandshake } from "lucide-react";
import { EditorialStory } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";
import { SectionHeading } from "./section-heading";
import { EditorialCard } from "./editorial-card";

export interface EditorialSectionProps {
  stories?: EditorialStory[];
}

export function EditorialSection({
  stories = HOMEPAGE_DATA.editorialStories,
}: EditorialSectionProps) {
  const atelierPillars = [
    {
      icon: <Scissors className="h-5 w-5 text-amber-700 dark:text-amber-400" />,
      title: "Sartorial Architecture",
      description:
        "Every pattern is drafted with anatomically contoured shoulder drops, sculpted lapels, and hand-finished pick stitching.",
    },
    {
      icon: <Feather className="h-5 w-5 text-amber-700 dark:text-amber-400" />,
      title: "Pure Raw Fibres",
      description:
        "From certified Normandy flax linen to Chanderi tissue silk and Mongolian cashmere. Zero synthetic shortcuts.",
    },
    {
      icon: <HeartHandshake className="h-5 w-5 text-amber-700 dark:text-amber-400" />,
      title: "Artisanal Integrity",
      description:
        "We collaborate directly with heritage weaving clusters in Jaipur, Varanasi, and Maheshwar, ensuring generational continuity.",
    },
  ];

  return (
    <section aria-label="Fashion Editorial & Atelier Story" className="container mx-auto px-4 py-16 sm:py-24 border-t border-border/60 space-y-16">
      {/* 1. Magazine Style Notes & Stories */}
      <div>
        <SectionHeading
          eyebrow="Magazine & Style Notes"
          title="The VÉRONA Edit"
          description="Perspectives on sartorial architecture, artisan origins, and contemporary wardrobe philosophies."
          action={{
            label: "Explore All Stories",
            href: ROUTES.NEW_ARRIVALS,
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {stories.map((story) => (
            <EditorialCard key={story.id} story={story} />
          ))}
        </div>
      </div>

      {/* 2. Atelier Craftsmanship Manifesto */}
      <div className="rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/30 p-8 sm:p-12 border border-border/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block font-medium">
              The Atelier Philosophy
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-light text-foreground leading-tight uppercase">
              Where Craft Meets Contemporary Silhouette.
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
              Founded with an uncompromising conviction: modern fashion should feel deeply thoughtful, tactile, and enduring. VÉRONA bridges timeless Indian craft traditions with European tailoring precision.
            </p>
            <div className="pt-2">
              <Link
                href={ROUTES.STATES}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 underline underline-offset-4 transition-colors"
              >
                <span>Read The Full Manifesto</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {atelierPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/70 bg-surface p-5 sm:p-6 space-y-3 shadow-subtle"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                  {pillar.icon}
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {pillar.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
