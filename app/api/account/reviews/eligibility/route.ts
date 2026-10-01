/**
 * VÉRONA — Review Eligibility Check API Route
 *
 * GET /api/account/reviews/eligibility?productId=...
 * Evaluates whether authenticated customer can review a product,
 * checking delivered order history and previous review existence.
 */

import { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { reviewEligibilityService } from "@/modules/reviews";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return apiSuccess({
        isEligible: false,
        alreadyReviewed: false,
        ineligibleReason: "Please sign in to write a verified review.",
      }, { headers: PRIVATE_CACHE_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      throw new ValidationError("productId query parameter is required");
    }

    const orderId = searchParams.get("orderId") || undefined;
    const orderItemId = searchParams.get("orderItemId") || undefined;

    const result = await reviewEligibilityService.evaluateEligibility(
      customer._id.toString(),
      productId,
      orderId,
      orderItemId
    );

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
