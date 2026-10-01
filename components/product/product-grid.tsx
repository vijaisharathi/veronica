import * as React from "react";
import { ProductPreview } from "@/types/storefront";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface ProductGridProps {
  products: ProductPreview[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ProductGrid({
  products,
  emptyTitle = "No garments found",
  emptyDescription = "We couldn't find any pieces matching your current filter criteria. Try resetting filters.",
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel="Browse All Collections"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6",
        className
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
