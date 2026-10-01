import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { returnEligibilityService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/account/returns/eligibility/[orderId]
 * Evaluates return eligibility for an order and its items.
 * Anti-IDOR: Enforces customer ownership.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { orderId } = await context.params;

    const eligibility = await returnEligibilityService.evaluateOrderEligibility(
      orderId,
      customerId
    );

    return apiSuccess(eligibility, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
