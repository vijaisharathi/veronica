import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionPreview } from "@/types/storefront";
import { HOMEPAGE_DATA } from "@/config/homepage";

export interface FeaturedCollectionProps {
  collection?: CollectionPreview;
}

export function FeaturedCollection({
  collection = HOMEPAGE_DATA.featuredCollection,
}: FeaturedCollectionProps) {
  if (!collection) {
    return null;
  }

  return (
    <section aria-label="Featured Collection" className="container mx-auto px-4 py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white border border-neutral-800 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px] lg:min-h-[560px]">
          {/* Visual Editorial Image */}
          <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden">
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover object-center transition-transform duration-1000 ease-out hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          </div>

          {/* Editorial Narrative & CTA */}
          <div className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 lg:p-14 space-y-6 bg-neutral-950">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-amber-300">
              <span>{collection.subtitle || "Editorial Campaign"}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-light tracking-wide leading-tight uppercase">
              {collection.title}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
              {collection.tagline}
            </p>

            <div className="pt-2">
              <Link href={collection.ctaLink}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-neutral-950 font-medium tracking-widest text-xs h-11 px-6 transition-all"
                >
                  {collection.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
