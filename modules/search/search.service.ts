/**
 * VÉRONA — Search Domain Service
 *
 * Core search business logic sitting between API/Storefront UI and the SearchProvider.
 * Coordinates query normalization, search execution, customer-safe DTO transformations,
 * facet extraction, and analytics event capture.
 */

import {
  SearchProvider,
  SearchRequest,
  SearchResultPayload,
  SearchSuggestionPayload,
  SearchAnalyticsEvent,
} from "./search.types";
import { mongoSearchProvider } from "./providers/mongo-search.provider";
import { normalizeSearchQuery } from "./search.normalizer";
import { productService } from "@/modules/catalog/product.service";
import { toProductPreview, ProductDTO } from "@/modules/catalog/product.dto";
import { ProductPreview } from "@/types/storefront";
import { logger } from "@/lib/logger";

export class SearchService {
  private provider: SearchProvider;

  constructor(provider: SearchProvider = mongoSearchProvider) {
    this.provider = provider;
  }

  /**
   * Set or swap search provider dynamically (e.g. for testing or migrating to Atlas Search)
   */
  public setProvider(provider: SearchProvider): void {
    this.provider = provider;
  }

  /**
   * Primary search execution with query normalization, ranking, and customer-safe DTO mapping
   */
  public async searchProducts(request: SearchRequest): Promise<SearchResultPayload> {
    const rawQuery = request.query || "";
    const normalized = normalizeSearchQuery(rawQuery);

    const providerResult = await this.provider.search(request, normalized);

    // Transform raw MongoDB documents into customer-safe ProductDTOs and Storefront Previews
    const dtos: ProductDTO[] = [];
    const items: ProductPreview[] = [];

    for (const prod of providerResult.products) {
      const prodIdStr = prod._id.toString();
      const variants = providerResult.variantsMap.get(prodIdStr) || [];
      const brand = prod.brandId ? providerResult.brandMap.get(prod.brandId.toString()) || null : null;

      const categories = (prod.categoryIds || [])
        .map((catId) => providerResult.categoryMap.get(catId.toString()))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      const collections = (prod.collectionIds || [])
        .map((colId) => providerResult.collectionMap.get(colId.toString()))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      const dto = productService.toProductDTO(prod, variants, brand, categories, collections);
      dtos.push(dto);
      items.push(toProductPreview(dto));
    }

    // Build the finalized search payload
    const payload: SearchResultPayload = {
      items,
      dtos,
      query: rawQuery.trim(),
      normalizedQuery: normalized.normalized,
      total: providerResult.total,
      page: providerResult.page,
      limit: providerResult.limit,
      totalPages: providerResult.totalPages,
      hasNext: providerResult.hasNext,
      hasPrev: providerResult.hasPrev,
      facets: providerResult.facets,
      activeFilters: {
        category: request.category,
        collection: request.collection,
        brand: request.brand,
        gender: request.gender,
        color: request.color,
        size: request.size,
        productType: request.productType,
        fabric: request.fabric,
        fit: request.fit,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
        inStock: request.inStock,
      },
      sort: request.sort || "relevance",
      didYouMean: providerResult.didYouMean,
    };

    // Capture search analytics asynchronously without blocking storefront response
    if (normalized.normalized.length > 0) {
      this.recordSearchAnalytics({
        eventType: providerResult.total === 0 ? "search_no_results" : "search_submitted",
        query: rawQuery,
        normalizedQuery: normalized.normalized,
        resultCount: providerResult.total,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        logger.warn("Failed to record search analytics event", { error: String(err) }, "SearchService");
      });
    }

    return payload;
  }

  /**
   * Lightweight autocomplete and suggestions endpoint
   */
  public async getSuggestions(query: string, limit: number = 8): Promise<SearchSuggestionPayload> {
    const normalized = normalizeSearchQuery(query);
    return this.provider.suggest(query, normalized, limit);
  }

  /**
   * Logs search telemetry events conforming to the search analytics foundation
   */
  public async recordSearchAnalytics(event: SearchAnalyticsEvent): Promise<void> {
    // Structured telemetry logging. Future phases (Phase 25/27) can sink this to an events collection or stream.
    logger.info("Search analytics event", event, "SearchAnalytics");
  }
}

export const searchService = new SearchService();
