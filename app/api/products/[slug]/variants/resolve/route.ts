/**
 * VÉRONA — Public Product Variant Resolution API Route
 *
 * GET /api/products/[slug]/variants/resolve?color=...&size=...
 * Resolves exact variant matching selected color and size without arbitrary fallbacks.
 * Rejects invalid combinations with an explicit unavailable state.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { validateQueryParams } from "@/lib/validation";
import { VariantResolutionQuerySchema } from "@/modules/catalog/catalog.validation";

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
    const { searchParams } = new URL(request.url);

    const query = validateQueryParams(searchParams, VariantResolutionQuerySchema);
    const result = await productService.resolveProductVariant(slug, query.color, query.size);

    return apiSuccess({
      status: result.status,
      resolvedVariant: result.variant,
      sku: result.sku,
      price: result.price,
      media: result.media,
      isAvailable: result.isAvailable,
      message: result.message,
    });
  } catch (error) {
    return apiError(error);
  }
}
