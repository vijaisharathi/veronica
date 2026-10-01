import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { returnService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ returnNumber: string }>;
}

/**
 * GET /api/account/returns/[returnNumber]
 * Retrieves customer-facing return details including item status, timeline, and tracking.
 * Anti-IDOR: Rejects requests for returns belonging to another customer.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { returnNumber } = await context.params;

    const returnDto = await returnService.getReturnForCustomer(returnNumber, customerId);

    return apiSuccess(returnDto, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
