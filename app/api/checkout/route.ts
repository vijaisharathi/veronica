import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { checkoutService } from "@/modules/checkout";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/checkout
 * Retrieves the currently active checkout session for the authenticated customer.
 * Anti-IDOR: Customer identity is strictly derived from the session.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const checkout = await checkoutService.getActiveCheckout(customerId);
    return apiSuccess(checkout, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * POST /api/checkout
 * Initializes or refreshes a checkout session for the authenticated customer.
 * Anti-tamper: All totals, cart items, customer IDs, and pricing are derived server-side.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const addressId = typeof body?.addressId === "string" ? body.addressId : undefined;

    const checkout = await checkoutService.initializeCheckout(customerId, addressId);
    return apiSuccess(checkout, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
