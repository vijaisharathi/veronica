import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 space-y-8 animate-pulse">
      {/* Breadcrumbs Skeleton */}
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <Skeleton className="h-4 w-12" />
        <span className="text-muted-foreground/40">/</span>
        <Skeleton className="h-4 w-16" />
        <span className="text-muted-foreground/40">/</span>
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Main PDP Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Gallery Skeleton */}
        <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4">
          <div className="flex lg:flex-col gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-16 sm:h-24 sm:w-20 rounded" />
            ))}
          </div>
          <Skeleton className="flex-1 aspect-[3/4] rounded-lg" />
        </div>

        {/* Right: Info Panel Skeleton */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3 border-b border-border/80 pb-5">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <div className="flex items-baseline gap-3 pt-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>

          {/* Color Selector Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>

          {/* Size Selector Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-11 rounded" />
              ))}
            </div>
          </div>

          {/* CTA Buttons Skeleton */}
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 flex-1 rounded" />
            <Skeleton className="h-12 w-12 rounded" />
          </div>

          {/* Delivery Box Skeleton */}
          <Skeleton className="h-24 w-full rounded-lg" />

          {/* Accordion Skeletons */}
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
