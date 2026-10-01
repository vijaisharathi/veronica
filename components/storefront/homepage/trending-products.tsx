import * as React from "react";
import { ProductPreview } from "@/types/storefront";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";
import { SectionHeading } from "./section-heading";
import { ProductRail } from "./product-rail";

export interface TrendingProductsProps {
  products?: ProductPreview[];
}

export function TrendingProducts({
  products = HOMEPAGE_DATA.trendingProducts,
}: TrendingProductsProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section aria-label="Trending Products" className="container mx-auto px-4 py-14 sm:py-18">
      <SectionHeading
        eyebrow="Trending Right Now"
        title="The Current Edit"
        description="Sculptural evening silhouettes and relaxed tailoring dominating the current season."
        action={{
          label: "View All Trending",
          href: ROUTES.NEW_ARRIVALS,
        }}
      />

      <ProductRail
        products={products}
        ariaLabel="Trending fashion products"
        priorityFirst={false}
      />
    </section>
  );
}
