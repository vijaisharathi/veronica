/**
 * VÉRONA — Search Suggestions API Route
 *
 * GET /api/search/suggestions — Returns lightweight autocomplete suggestions
 * matching products, categories, collections, and brands.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { searchService } from "@/modules/search/search.service";
import { SearchSuggestionQuerySchema } from "@/modules/search/search.validation";
import { validateQueryParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validatedParams = validateQueryParams(searchParams, SearchSuggestionQuerySchema);

    const suggestions = await searchService.getSuggestions(
      validatedParams.q,
      validatedParams.limit
    );

    return apiSuccess(suggestions);
  } catch (error) {
    return apiError(error);
  }
}
