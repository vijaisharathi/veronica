"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductPreview } from "@/types/storefront";
import { ProductCard } from "@/components/product/product-card";

export interface ProductRailProps {
  products: ProductPreview[];
  ariaLabel?: string;
  priorityFirst?: boolean;
}

export function ProductRail({
  products,
  ariaLabel = "Product rail",
  priorityFirst = false,
}: ProductRailProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="relative group/rail w-full" aria-label={ariaLabel}>
      {/* Desktop Navigation Arrows */}
      <div className="hidden lg:flex items-center gap-1.5 absolute -top-14 right-0 z-10">
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll products left"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll products right"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable / Responsive Container */}
      {/* On mobile/tablet: horizontal scroll with snap. On desktop (lg+): 4-column grid or smooth scroll */}
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-4 pt-1 px-1 -mx-1 snap-x snap-mandatory scroll-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[240px] sm:w-[280px] lg:w-auto shrink-0 snap-start"
          >
            <ProductCard product={product} priority={priorityFirst && index === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
