"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Sparkles, Clock, X, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { useRecentSearches } from "@/modules/search/recent-searches";
import { ROUTES } from "@/config/routes";

export interface SearchEmptyStateProps {
  type: "no_query" | "no_results" | "error";
  query?: string;
  didYouMean?: string | null;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onRetry?: () => void;
}

export function SearchEmptyState({
  type,
  query = "",
  didYouMean,
  hasActiveFilters = false,
  onClearFilters,
  onRetry,
}: SearchEmptyStateProps) {
  const { recentSearches, isLoaded, removeSearch, clearSearches } = useRecentSearches();

  if (type === "error") {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl font-light text-foreground">
          Search Service Unavailable
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We encountered an issue retrieving catalog records for your inquiry. Please try again in a few moments.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-neutral-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors dark:bg-white dark:text-neutral-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Search</span>
          </button>
        )}
      </div>
    );
  }

  if (type === "no_results") {
    return (
      <div className="py-12 space-y-10 max-w-2xl mx-auto text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
            <Search className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground">
            No garments found for &ldquo;{query}&rdquo;
          </h2>

          {didYouMean && (
            <div className="pt-2">
              <span className="text-xs text-muted-foreground">Did you mean: </span>
              <Link
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(didYouMean)}`}
                className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
              >
                &ldquo;{didYouMean}&rdquo;
              </Link>
            </div>
          )}

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed pt-1">
            {hasActiveFilters
              ? "Your active filter criteria might be too restrictive. Try resetting filters or expanding your price range."
              : "Check your spelling, try broader keywords such as linen, blazer, or gown, or explore our curated silhouettes."}
          </p>

          {hasActiveFilters && onClearFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-background hover:bg-neutral-50 text-xs font-medium text-foreground transition-colors dark:hover:bg-neutral-800"
              >
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Curated Recommendations */}
        <div className="border-t border-border pt-8 space-y-4">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground block">
            Suggested Fashion Queries
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Cashmere Coat",
              "Silk Gown",
              "Linen Shirt",
              "Tuxedo Blazer",
              "Pleated Skirt",
              "Tailored Trouser",
            ].map((term) => (
              <Link
                key={term}
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(term)}`}
                className="px-3.5 py-1.5 rounded-full border border-border text-xs text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>

        {/* Global Shop CTA */}
        <div className="pt-2">
          <Link
            href={ROUTES.SHOP}
            className="inline-flex items-center gap-1.5 text-xs uppercase font-mono tracking-widest text-primary underline underline-offset-4 hover:opacity-80"
          >
            <span>Browse Complete VÉRONA Catalog</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Type: "no_query" (Blank search discovery landing)
  return (
    <div className="py-8 space-y-12 max-w-4xl mx-auto">
      {/* 1. Recent Searches */}
      {isLoaded && recentSearches.length > 0 && (
        <div className="border border-border p-6 rounded-sm bg-background shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Recent Searches</span>
            </div>
            <button
              type="button"
              onClick={clearSearches}
              className="text-[10px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono"
            >
              Clear History
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-xs text-neutral-800 transition-colors dark:bg-neutral-800 dark:text-neutral-200"
              >
                <Link href={`${ROUTES.SEARCH}?q=${encodeURIComponent(term)}`} className="hover:underline">
                  {term}
                </Link>
                <button
                  type="button"
                  onClick={() => removeSearch(term)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-0.5 rounded-full"
                  aria-label={`Remove ${term}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Curated Silhouettes */}
      <div className="border border-border p-6 rounded-sm bg-background shadow-subtle space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Curated Silhouettes</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Cashmere Overcoat",
            "Mulberry Silk Dress",
            "Double-Breasted Blazer",
            "Irish Linen Shirt",
            "Pleated Evening Trouser",
            "Merino Wool Knit",
          ].map((term, i) => (
            <Link
              key={i}
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-border hover:border-neutral-900 px-3.5 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 transition-colors dark:text-neutral-300 dark:hover:text-white"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Explore Departments CTA */}
      <div className="bg-neutral-900 text-white p-8 sm:p-12 rounded-sm text-center space-y-4">
        <h3 className="font-serif text-2xl sm:text-3xl font-light">
          Browse the Full VÉRONA Catalog
        </h3>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Explore complete garment listings with active filters for fabric, size, color, and price across all ateliers.
        </p>
        <Link
          href={ROUTES.SHOP}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-900 text-xs font-medium uppercase tracking-wider hover:bg-neutral-100 transition-colors"
        >
          <span>Explore All Garments</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
