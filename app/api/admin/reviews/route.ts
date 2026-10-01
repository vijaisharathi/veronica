/**
 * VÉRONA — Admin Reviews Moderation Queue API Route
 *
 * GET /api/admin/reviews — Query reviews across catalog with moderation state filters.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { reviewRepository } from "@/modules/reviews";
import { ReviewStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REVIEWS_READ,
      PERMISSIONS.REVIEWS_MODERATE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as ReviewStatus | null;
    const status = statusParam && Object.values(ReviewStatus).includes(statusParam) ? statusParam : undefined;
    const ratingParam = searchParams.get("rating");
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;
    const productId = searchParams.get("productId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const reportedOnly = searchParams.get("reportedOnly") === "true";
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await reviewRepository.findAdminReviews({
      status,
      rating,
      productId,
      customerId,
      reportedOnly,
      search,
      page,
      limit,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
