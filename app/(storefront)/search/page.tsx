import * as React from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ProductGrid } from "@/components/product/product-grid";
import {
  SearchBar,
  SearchFilters,
  SearchSortControl,
  SearchEmptyState,
  SearchPagination,
} from "@/components/search";
import { searchService } from "@/modules/search/search.service";
import { SearchSort, SearchResultPayload } from "@/modules/search/search.types";
import { logger } from "@/lib/logger";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    query?: string;
    category?: string;
    collection?: string;
    brand?: string;
    gender?: string;
    color?: string;
    size?: string;
    productType?: string;
    fabric?: string;
    fit?: string;
    pattern?: string;
    occasion?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawQuery = params.q || params.query || "";
  const query = rawQuery.trim();

  // Deterministic canonical URL construction
  const canonicalParams = new URLSearchParams();
  if (query) canonicalParams.set("q", query);
  if (params.category) canonicalParams.set("category", params.category);
  if (params.collection) canonicalParams.set("collection", params.collection);
  if (params.brand) canonicalParams.set("brand", params.brand);
  if (params.gender) canonicalParams.set("gender", params.gender);

  const canonicalUrl = canonicalParams.toString()
    ? `/search?${canonicalParams.toString()}`
    : "/search";

  return {
    title: query ? `Search: “${query}” | VÉRONA` : "Search Catalog & Silhouettes | VÉRONA",
    description: query
      ? `Discover luxury garments, tailoring, and curated fashion matching “${query}” at VÉRONA.`
      : "Explore the VÉRONA atelier catalog through natural query discovery and refined garment attributes.",
    // SEO Safeguard: Do not index arbitrary search queries to prevent index bloat
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = (params.q || params.query || "").trim();

  // If no query is provided, render the curated empty search landing (Requirement 38)
  if (!rawQuery) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumbs items={[{ label: "Search" }]} />

        <div className="border-b border-border/80 pb-8 space-y-4 text-center max-w-2xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
            Search The Atelier
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-light tracking-tight">
            Discover VÉRONA Silhouettes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Search our curated collections across Men’s, Women’s, and Junior ateliers, or enter an exact SKU.
          </p>
          <div className="pt-2">
            <SearchBar autoFocus initialQuery="" />
          </div>
        </div>

        <SearchEmptyState type="no_query" />
      </div>
    );
  }

  // Parse numerical parameters safely
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = params.limit ? parseInt(params.limit, 10) : 20;
  const sort = (params.sort as SearchSort) || "relevance";

  let searchResult: SearchResultPayload | null = null;
  let hasError = false;

  try {
    searchResult = await searchService.searchProducts({
      query: rawQuery,
      category: params.category,
      collection: params.collection,
      brand: params.brand,
      gender: params.gender,
      color: params.color,
      size: params.size,
      productType: params.productType,
      fabric: params.fabric,
      fit: params.fit,
      pattern: params.pattern,
      occasion: params.occasion,
      minPrice: !isNaN(minPrice!) ? minPrice : undefined,
      maxPrice: !isNaN(maxPrice!) ? maxPrice : undefined,
      inStock: params.inStock === "true",
      sort,
      page: !isNaN(page) && page > 0 ? page : 1,
      limit: !isNaN(limit) && limit > 0 && limit <= 50 ? limit : 20,
    });
  } catch (err) {
    logger.error("Failed to execute search in SearchPage", { error: String(err), query: rawQuery }, "SearchPage");
    hasError = true;
  }

  if (hasError || !searchResult) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumbs items={[{ label: "Search" }]} />
        <div className="pt-4">
          <SearchBar initialQuery={rawQuery} />
        </div>
        <SearchEmptyState type="error" query={rawQuery} />
      </div>
    );
  }

  const { items, total, totalPages, page: currentPage, facets, activeFilters, didYouMean } = searchResult;
  const hasActiveFilters = Object.values(activeFilters).some((val) => val !== undefined && val !== false);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: "Search", href: "/search" }, { label: `“${rawQuery}”` }]} />

      {/* Search Header and Input */}
      <div className="border-b border-border/80 pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-1">
              Search Results
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-light tracking-tight">
              {total > 0 ? (
                <>
                  {total} {total === 1 ? "Result" : "Results"} for “{rawQuery}”
                </>
              ) : (
                <>No Results for “{rawQuery}”</>
              )}
            </h1>
          </div>

          {/* Sort Controls */}
          {total > 0 && (
            <div className="self-end sm:self-auto">
              <SearchSortControl currentSort={sort} />
            </div>
          )}
        </div>

        <div className="pt-2">
          <SearchBar initialQuery={rawQuery} />
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Results Grid */}
      {total > 0 ? (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters Sidebar (Desktop & Mobile) */}
          <SearchFilters
            facets={facets}
            activeFilters={activeFilters}
            className="w-full lg:w-64"
          />

          {/* Product Results */}
          <div className="flex-1 w-full space-y-8">
            <ProductGrid products={items} />
            <SearchPagination currentPage={currentPage} totalPages={totalPages} />
          </div>
        </div>
      ) : (
        <SearchEmptyState
          type="no_results"
          query={rawQuery}
          didYouMean={didYouMean}
          hasActiveFilters={hasActiveFilters}
        />
      )}
    </div>
  );
}
