import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { StyleCategory } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { SectionHeading } from "./section-heading";

export interface StyleDiscoveryProps {
  styles?: StyleCategory[];
}

export function StyleDiscovery({
  styles = HOMEPAGE_DATA.styleCategories,
}: StyleDiscoveryProps) {
  if (!styles || styles.length === 0) {
    return null;
  }

  return (
    <section aria-label="Style Discovery" className="container mx-auto px-4 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Wardrobe Aesthetics"
        title="Discover By Style"
        description="Curated aesthetic edits crafted around how you express distinction through form and fabric."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {styles.map((style) => (
          <Link
            key={style.id}
            href={style.href}
            className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-900 border border-border/60 transition-all duration-300 hover:shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Explore ${style.name} style`}
          >
            <Image
              src={style.image}
              alt={style.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-85 group-hover:opacity-100"
            />

            {style.tag && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="rounded bg-neutral-950/80 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono tracking-wider text-amber-300 uppercase font-semibold">
                  {style.tag}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/40 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-white">
              <div className="flex items-end justify-between gap-1.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium tracking-wide font-serif uppercase">
                    {style.name}
                  </h3>
                  <p className="text-[10px] text-neutral-300 line-clamp-1 font-light opacity-90 mt-0.5">
                    {style.descriptor}
                  </p>
                </div>
                <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-neutral-950">
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
