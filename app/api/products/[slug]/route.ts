/**
 * VÉRONA — Public Product Detail API Route
 *
 * GET /api/products/[slug] — Resolves customer-safe product detail by unique slug.
 * Returns 404 for non-existent, draft, or archived products.
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
    const result = await productService.getProductBySlug(slug);

    return apiSuccess({
      product: result.product,
      preview: result.preview,
      relatedProducts: result.relatedProducts,
      breadcrumbs: result.breadcrumbs,
    });
  } catch (error) {
    return apiError(error);
  }
}
