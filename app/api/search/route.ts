/**
 * VÉRONA — Public Search API Route
 *
 * GET /api/search — Returns ranked search results, active filter counts, and pagination.
 * Validates inputs server-side, guards against excessive limit parameters,
 * and strips private catalog fields.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { searchService } from "@/modules/search/search.service";
import { SearchQuerySchema } from "@/modules/search/search.validation";
import { validateQueryParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validatedParams = validateQueryParams(searchParams, SearchQuerySchema);

    const query = validatedParams.q || validatedParams.query || "";

    const result = await searchService.searchProducts({
      query,
      category: validatedParams.category,
      collection: validatedParams.collection,
      brand: validatedParams.brand,
      gender: validatedParams.gender,
      color: validatedParams.color,
      size: validatedParams.size,
      productType: validatedParams.productType,
      fabric: validatedParams.fabric,
      fit: validatedParams.fit,
      pattern: validatedParams.pattern,
      occasion: validatedParams.occasion,
      minPrice: validatedParams.minPrice,
      maxPrice: validatedParams.maxPrice,
      inStock: validatedParams.inStock,
      sort: validatedParams.sort,
      page: validatedParams.page,
      limit: validatedParams.limit,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
