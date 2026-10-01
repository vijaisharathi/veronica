/**
 * VÉRONA — Collection Products API Route
 *
 * GET /api/collections/[slug]/products — Returns products belonging to a specific collection.
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

    const result = await productService.getProductsByCollection(slug, validatedParams);

    return apiSuccess({
      collection: {
        id: result.collection._id.toString(),
        name: result.collection.name,
        slug: result.collection.slug,
        heroImage: result.collection.heroImage,
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
