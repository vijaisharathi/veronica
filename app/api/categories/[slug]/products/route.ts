/**
 * VÉRONA — Category Products API Route
 *
 * GET /api/categories/[slug]/products — Returns products belonging to a specific category.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { ProductListQuerySchema } from "@/modules/catalog/catalog.validation";
import { validateQueryParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = request.nextUrl;
    const validatedParams = validateQueryParams(searchParams, ProductListQuerySchema);

    const result = await productService.getProductsByCategory(slug, validatedParams);

    return apiSuccess({
      category: {
        id: result.category._id.toString(),
        name: result.category.name,
        slug: result.category.slug,
        gender: result.category.gender,
      },
      products: result.products.items,
      pagination: {
        page: result.products.page,
        limit: result.products.limit,
        total: result.products.total,
        totalPages: result.products.totalPages,
        hasMore: result.products.hasMore,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
