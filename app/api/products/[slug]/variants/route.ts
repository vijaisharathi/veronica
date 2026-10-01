/**
 * VÉRONA — Public Product Variants API Route
 *
 * GET /api/products/[slug]/variants
 * Resolves active variants, Color x Size availability matrix, and dimension rules
 * for a published silhouette.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const result = await productService.getVariantsByProductSlug(slug);

    return apiSuccess({
      productId: result.product.id,
      productName: result.product.name,
      productSlug: result.product.slug,
      variants: result.variants,
      matrix: result.matrix,
      dimensions: result.dimensions,
    });
  } catch (error) {
    return apiError(error);
  }
}
