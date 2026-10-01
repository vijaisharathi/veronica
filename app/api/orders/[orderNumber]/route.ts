import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { orderService } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ orderNumber: string }>;
}

/**
 * GET /api/orders/[orderNumber]
 * Retrieves customer-facing order detail with immutable snapshots and timeline.
 * Anti-IDOR: Rejects requests for orders belonging to another customer.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { orderNumber } = await context.params;

    const order = await orderService.getOrderByNumber(customerId, orderNumber);

    return apiSuccess(order, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
