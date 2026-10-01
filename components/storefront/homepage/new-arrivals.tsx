import * as React from "react";
import { ProductPreview } from "@/types/storefront";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";
import { SectionHeading } from "./section-heading";
import { ProductRail } from "./product-rail";

export interface NewArrivalsProps {
  products?: ProductPreview[];
}

export function NewArrivals({
  products = HOMEPAGE_DATA.newArrivals,
}: NewArrivalsProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="New Season Arrivals"
      className="container mx-auto px-4 sm:px-6 py-14 sm:py-18 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-2xl my-8 border border-border/50"
    >
      <SectionHeading
        eyebrow="Fresh From Jaipur & Milan Ateliers"
        title="New Season Arrivals"
        description="Handwoven Chanderi silks, pure Mongolian cashmere, and structured summer staples."
        action={{
          label: "View All New Arrivals",
          href: ROUTES.NEW_ARRIVALS,
        }}
      />

      <ProductRail
        products={products}
        ariaLabel="New arrival products"
        priorityFirst={false}
      />
    </section>
  );
}
