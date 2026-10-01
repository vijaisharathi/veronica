import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { CollectionTile } from "@/types/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";

export interface CollectionGridProps {
  collections?: CollectionTile[];
}

export function CollectionGrid({
  collections = HOMEPAGE_DATA.collectionGrid,
}: CollectionGridProps) {
  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <section aria-label="Curated Collections" className="container mx-auto px-4 pb-16">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {collections.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-900 border border-border/60 transition-all duration-300 hover:shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Explore ${item.title}`}
          >
            <Image
              src={item.image}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/40 to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
              <div className="flex items-end justify-between gap-2">
                <div className="space-y-1">
                  {item.itemCountLabel && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 block">
                      {item.itemCountLabel}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-serif font-normal uppercase tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-neutral-300 line-clamp-1 font-light opacity-90">
                    {item.tagline}
                  </p>
                </div>
                <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-neutral-950">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
