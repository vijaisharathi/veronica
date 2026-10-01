/**
 * VÉRONA — Public Products API Route
 *
 * GET /api/products — Returns paginated, customer-safe product listings.
 * Enforces server-side status (PUBLISHED) and visibility (PUBLIC).
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { ProductListQuerySchema } from "@/modules/catalog/catalog.validation";
import { validateQueryParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validatedParams = validateQueryParams(searchParams, ProductListQuerySchema);

    const result = await productService.getProducts(validatedParams);

    return apiSuccess({
      items: result.dtos,
      previews: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
