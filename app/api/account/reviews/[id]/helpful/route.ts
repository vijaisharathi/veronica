/**
 * VÉRONA — Review Helpful Voting API Route
 *
 * POST   /api/account/reviews/[id]/helpful — Cast helpful vote (idempotent)
 * DELETE /api/account/reviews/[id]/helpful — Retract helpful vote (idempotent)
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, TooManyRequestsError } from "@/lib/errors";
import { reviewVoteService } from "@/modules/reviews";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { id } = await context.params;

    // Rate limiting: max 30 votes per minute per customer
    const rateCheck = checkRateLimit(`review_vote_${customerId}`, 30, 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError("Too many voting attempts. Please slow down.");
    }

    const result = await reviewVoteService.voteHelpful(id, customerId);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
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
    const customerId = customer._id.toString();
    const { id } = await context.params;

    const result = await reviewVoteService.removeHelpful(id, customerId);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
