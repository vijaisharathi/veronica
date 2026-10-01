/**
 * VÉRONA — Customer Reviews API Route
 *
 * GET  /api/account/reviews — List authenticated customer's reviews.
 * POST /api/account/reviews — Submit verified purchase review with strict server-side validation.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError, TooManyRequestsError } from "@/lib/errors";
import { reviewService } from "@/modules/reviews";
import { CreateReviewSchema } from "@/modules/reviews/validators/review.validators";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await reviewService.getCustomerReviews(
      customer._id.toString(),
      page,
      limit
    );

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    // Rate limiting: Max 10 reviews submitted per hour per customer
    const rateCheck = checkRateLimit(`review_submit_${customerId}`, 10, 60 * 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError(
        "You have reached the review submission limit. Please try again later."
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid review payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const review = await reviewService.createReview(customerId, parsed.data);

    return apiSuccess(
      {
        reviewId: review._id.toString(),
        status: review.status,
        message: "Your review has been successfully submitted and verified.",
      },
      { status: 201, headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
