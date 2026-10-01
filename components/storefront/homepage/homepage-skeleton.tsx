import * as React from "react";

export function HomepageSkeleton() {
  return (
    <div className="w-full space-y-16 animate-pulse" aria-label="Loading homepage content" role="status">
      {/* 1. Hero Skeleton */}
      <div className="relative min-h-[580px] sm:min-h-[680px] w-full bg-neutral-900 flex items-center">
        <div className="container mx-auto px-4 space-y-6">
          <div className="h-6 w-48 bg-neutral-800 rounded-full" />
          <div className="h-16 w-80 sm:w-96 bg-neutral-800 rounded" />
          <div className="h-12 w-full max-w-md bg-neutral-800 rounded" />
          <div className="flex gap-4 pt-2">
            <div className="h-12 w-36 bg-neutral-700 rounded" />
            <div className="h-12 w-36 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>

      {/* 2. Category Grid Skeleton */}
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end border-b border-border pb-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
          <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>

      {/* 3. Product Rail Skeleton */}
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end border-b border-border pb-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
          <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
