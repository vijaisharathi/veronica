import * as React from "react";
import { ProductPreview } from "@/types/storefront";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";
import { SectionHeading } from "./section-heading";
import { ProductRail } from "./product-rail";

export interface PopularPicksProps {
  products?: ProductPreview[];
}

export function PopularPicks({
  products = HOMEPAGE_DATA.popularPicks,
}: PopularPicksProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section aria-label="Popular Picks" className="container mx-auto px-4 py-14 sm:py-18">
      <SectionHeading
        eyebrow="Connoisseur Favorites"
        title="Popular Picks"
        description="The signature garments our patrons return to season after season for effortless distinction."
        action={{
          label: "Shop All Favorites",
          href: ROUTES.WOMEN,
        }}
      />

      <ProductRail
        products={products}
        ariaLabel="Popular fashion picks"
        priorityFirst={false}
      />
    </section>
  );
}
