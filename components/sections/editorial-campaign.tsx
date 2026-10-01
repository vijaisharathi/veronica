import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_COLLECTION } from "@/config/mock-storefront";

export function EditorialCampaign() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white border border-neutral-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px] lg:min-h-[560px]">
          {/* Visual Editorial Image */}
          <div className="lg:col-span-7 relative h-72 lg:h-auto overflow-hidden">
            <img
              src={MOCK_COLLECTION.image}
              alt={MOCK_COLLECTION.title}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          </div>

          {/* Editorial Narrative & CTA */}
          <div className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 lg:p-14 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-amber-300">
              <span>Editorial Campaign</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-serif font-light tracking-wide leading-tight uppercase">
              {MOCK_COLLECTION.title}
            </h3>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
              {MOCK_COLLECTION.tagline}
            </p>

            <div className="pt-2">
              <Link href={MOCK_COLLECTION.ctaLink}>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-neutral-950 font-medium tracking-widest text-xs">
                  {MOCK_COLLECTION.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
