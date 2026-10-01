import * as React from "react";
import { CategoryPreview } from "@/types/storefront";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";
import { SectionHeading } from "./section-heading";
import { CategoryCard } from "./category-card";

export interface CategoryDiscoveryProps {
  categories?: CategoryPreview[];
}

export function CategoryDiscovery({
  categories = HOMEPAGE_DATA.categories,
}: CategoryDiscoveryProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="category-discovery-heading" className="container mx-auto px-4 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Curated Departments"
        title="Shop By Category"
        description="Explore precision tailoring, fluid silks, and artisan weaves designed for every occasion."
        action={{
          label: "All Departments",
          href: ROUTES.WOMEN,
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
