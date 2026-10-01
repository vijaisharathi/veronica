/**
 * VÉRONA — Individual Customer Review Management API Route
 *
 * GET    /api/account/reviews/[id] — Retrieve customer review detail
 * PATCH  /api/account/reviews/[id] — Edit customer review
 * DELETE /api/account/reviews/[id] — Soft-delete customer review
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { reviewService, reviewRepository } from "@/modules/reviews";
import { UpdateReviewSchema } from "@/modules/reviews/validators/review.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new NotFoundError("Review", id);
    }

    if (review.customerId.toString() !== customer._id.toString()) {
      throw new ForbiddenError("You cannot view this review record");
    }

    return apiSuccess(review, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid update payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await reviewService.updateReview(
      id,
      customer._id.toString(),
      parsed.data
    );

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    await reviewService.deleteReview(id, customer._id.toString());

    return apiSuccess(
      { message: "Review successfully deleted" },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
