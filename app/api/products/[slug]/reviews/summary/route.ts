/**
 * VÉRONA — Public Product Review Summary API Route
 *
 * GET /api/products/[slug]/reviews/summary
 * Returns authoritative aggregate ratings and 1-5 star distribution.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { ProductModel } from "@/db/models";
import { reviewService } from "@/modules/reviews";

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

    let product = null;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await ProductModel.findById(slug).select("_id").lean();
    }
    if (!product) {
      product = await ProductModel.findOne({ slug: slug.toLowerCase(), isDeleted: false })
        .select("_id")
        .lean();
    }

    if (!product) {
      throw new NotFoundError("Product", slug);
    }

    const summary = await reviewService.getReviewSummary(product._id.toString());

    return apiSuccess(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
