/**
 * VÉRONA — Public Product Reviews API Route
 *
 * GET /api/products/[slug]/reviews
 * Returns paginated, sanitized, publicly approved reviews for a product.
 * Supports rating filtering, verified-only filtering, photo filtering, and sorting.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { ProductModel } from "@/db/models";
import { reviewService } from "@/modules/reviews";
import { getCurrentCustomer } from "@/lib/auth/session";

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

    // Resolve product ID from slug or ID
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

    const { searchParams } = new URL(request.url);
    const ratingParam = searchParams.get("rating");
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const withPhotosOnly = searchParams.get("withPhotosOnly") === "true";
    const sortBy = (searchParams.get("sortBy") as "newest" | "highest_rating" | "lowest_rating" | "most_helpful") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Optional customer context for helpful vote indicators
    const currentCustomer = await getCurrentCustomer().catch(() => null);

    const result = await reviewService.getPublicReviews({
      productId: product._id.toString(),
      rating,
      verifiedOnly,
      withPhotosOnly,
      sortBy,
      page,
      limit,
      currentCustomerId: currentCustomer?._id.toString(),
    });

    return apiSuccess(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
