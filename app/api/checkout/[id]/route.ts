import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { checkoutService } from "@/modules/checkout";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/checkout/[id]
 * Retrieves a single checkout session verifying customer ownership.
 * Anti-IDOR: Derives authenticated customer ID and asserts ownership.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const checkout = await checkoutService.getCheckout(customer._id.toString(), id);
    return apiSuccess(checkout, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
