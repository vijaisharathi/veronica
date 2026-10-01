import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { MOCK_PRODUCTS } from "@/config/mock-storefront";

export function TrendingSection() {
  const trendingProducts = MOCK_PRODUCTS.slice(0, 4);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-border/80 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400 block mb-1">
            Trending Right Now
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light uppercase tracking-wider text-foreground">
            The Current Edit
          </h2>
        </div>
        <Link
          href="/shop?sort=trending"
          className="mt-2 sm:mt-0 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 inline-flex items-center gap-1 transition-colors"
        >
          <span>View All Trending</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ProductGrid products={trendingProducts} />
    </section>
  );
}
