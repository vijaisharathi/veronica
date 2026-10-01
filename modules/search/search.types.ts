/**
 * VÉRONA — Search Domain Types & Contracts
 *
 * Defines typed contracts for product search queries, facets, suggestions,
 * and search provider abstractions.
 */

import { ProductPreview } from "@/types/storefront";
import { ProductDTO } from "@/modules/catalog/product.dto";
import { IProduct, IProductVariant, IBrand, ICategory, IFashionCollection } from "@/types/database";

export type SearchSort = "relevance" | "newest" | "price_asc" | "price_desc";

export interface SearchRequest {
  query?: string;
  category?: string; // slug or ID
  collection?: string; // slug or ID
  brand?: string; // slug or ID
  gender?: string; // MEN | WOMEN | KIDS | UNISEX
  color?: string; // color slug or name
  size?: string; // S | M | L | XL etc.
  productType?: string;
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  minPrice?: number; // In Rupees (or converted to minor units)
  maxPrice?: number; // In Rupees (or converted to minor units)
  inStock?: boolean;
  sort?: SearchSort;
  page?: number;
  limit?: number;
}

export interface NormalizedSearchQuery {
  raw: string;
  normalized: string;
  tokens: string[];
  expandedTerms: string[];
  isExactSkuMatch?: boolean;
}

export interface FacetCountItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface ColorFacetItem {
  name: string;
  slug: string;
  hexCode: string;
  count: number;
}

export interface SearchFilterFacets {
  categories: FacetCountItem[];
  brands: FacetCountItem[];
  collections: FacetCountItem[];
  genders: Array<{ label: string; value: string; count: number }>;
  colors: ColorFacetItem[];
  sizes: Array<{ label: string; count: number }>;
  fabrics: Array<{ label: string; count: number }>;
  fits: Array<{ label: string; count: number }>;
  priceRange: {
    min: number; // in Rupees
    max: number; // in Rupees
  };
}

export interface SearchActiveFilters {
  category?: string;
  collection?: string;
  brand?: string;
  gender?: string;
  color?: string;
  size?: string;
  productType?: string;
  fabric?: string;
  fit?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface SearchResultPayload {
  items: ProductPreview[];
  dtos: ProductDTO[];
  query: string;
  normalizedQuery: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  facets: SearchFilterFacets;
  activeFilters: SearchActiveFilters;
  sort: SearchSort;
  didYouMean?: string | null;
}

export type SuggestionType = "product" | "category" | "collection" | "brand" | "recent" | "curated";

export interface SearchSuggestionItem {
  id: string;
  type: SuggestionType;
  label: string;
  href: string;
  subtitle?: string;
  image?: string;
  price?: number;
}

export interface SearchSuggestionPayload {
  query: string;
  suggestions: SearchSuggestionItem[];
  categories: Array<{ id: string; name: string; slug: string; href: string }>;
  collections: Array<{ id: string; name: string; slug: string; href: string }>;
  brands: Array<{ id: string; name: string; slug: string; href: string }>;
  curatedTerms: string[];
}

export type SearchAnalyticsEventType =
  | "search_submitted"
  | "search_result_clicked"
  | "search_no_results"
  | "suggestion_clicked";

export interface SearchAnalyticsEvent {
  eventType: SearchAnalyticsEventType;
  query: string;
  normalizedQuery?: string;
  resultCount?: number;
  targetId?: string;
  targetSlug?: string;
  targetType?: string;
  sessionId?: string;
  timestamp: string;
}

export interface SearchProviderResult {
  products: IProduct[];
  variantsMap: Map<string, IProductVariant[]>;
  brandMap: Map<string, IBrand>;
  categoryMap: Map<string, ICategory>;
  collectionMap: Map<string, IFashionCollection>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  facets: SearchFilterFacets;
  didYouMean?: string | null;
}

/**
 * SearchProvider interface to decouple the search layer from the underlying engine.
 * Allows transparent swapping between MongoDB text search, Atlas Search, or external engines.
 */
export interface SearchProvider {
  search(request: SearchRequest, normalized: NormalizedSearchQuery): Promise<SearchProviderResult>;
  suggest(query: string, normalized: NormalizedSearchQuery, limit?: number): Promise<SearchSuggestionPayload>;
}
