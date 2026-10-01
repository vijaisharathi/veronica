import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MOCK_CATEGORIES } from "@/config/mock-storefront";

export function CategoryGrid() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 border-b border-border/80 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-1">
            Curated Departments
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light uppercase tracking-wider text-foreground">
            Shop By Category
          </h2>
        </div>
        <Link
          href="/shop"
          className="mt-2 sm:mt-0 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 inline-flex items-center gap-1 transition-colors"
        >
          <span>All Departments</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {MOCK_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-border/60"
          >
            <img
              src={category.image}
              alt={category.name}
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-white">
              <h3 className="text-xs sm:text-sm font-medium tracking-wide leading-snug">
                {category.name}
              </h3>
              <p className="text-[10px] font-mono text-neutral-300 mt-0.5 opacity-90">
                {category.itemCount}+ styles
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
