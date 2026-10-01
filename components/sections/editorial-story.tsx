import * as React from "react";
import Link from "next/link";
import { ArrowRight, Scissors, Feather, HeartHandshake } from "lucide-react";

export function EditorialStory() {
  const pillars = [
    {
      icon: <Scissors className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      title: "Sartorial Architecture",
      description: "Every pattern is drafted by master tailors with anatomically contoured shoulder drops and sculpted lapels.",
    },
    {
      icon: <Feather className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      title: "Pure Raw Fibres",
      description: "From certified Normandy flax linen to Chanderi tissue silk and Mongolian cashmere. Zero synthetic shortcuts.",
    },
    {
      icon: <HeartHandshake className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      title: "Artisanal Integrity",
      description: "We work directly with heritage weaving clusters in Jaipur, Varanasi, and Maheshwar, ensuring fair prosperity.",
    },
  ];

  return (
    <section className="container mx-auto px-4 py-16 sm:py-24 border-t border-border/80">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Story Intro */}
        <div className="lg:col-span-5 space-y-6">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block">
            The Atelier Philosophy
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-light text-foreground leading-tight uppercase">
            Where Craft Meets Contemporary Silhouette.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
            Founded with an uncompromising conviction: modern fashion should feel deeply thoughtful, tactile, and enduring. VÉRONA bridges timeless Indian craft traditions with European tailoring precision.
          </p>
          <div>
            <Link
              href="/states"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 underline underline-offset-4 transition-colors"
            >
              <span>Read The Full Manifesto</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-neutral-50/50 p-6 space-y-3 dark:bg-neutral-900/30"
            >
              <div className="h-10 w-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                {pillar.icon}
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {pillar.title}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
