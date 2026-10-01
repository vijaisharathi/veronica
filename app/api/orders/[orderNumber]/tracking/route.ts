import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
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
 * GET /api/orders/[orderNumber]/tracking
 * Customer-facing order tracking endpoint with chronological timeline and packages.
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

    const tracking = await shipmentService.getCustomerOrderTracking(orderNumber, customerId);

    return apiSuccess(tracking, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
