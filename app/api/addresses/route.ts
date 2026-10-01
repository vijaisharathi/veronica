import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { addressService } from "@/modules/addresses";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/addresses
 * Returns all active addresses for the authenticated customer.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const addresses = await addressService.listAddresses(customer._id.toString());
    return apiSuccess(addresses, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * POST /api/addresses
 * Creates a new address for the authenticated customer.
 * Customer ownership is automatically derived from the session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const body = await request.json().catch(() => ({}));

    // Prevent client identity spoofing
    delete body.customerId;
    delete body.userId;
    delete body.ownerId;

    const created = await addressService.createAddress(customer._id.toString(), body);
    return apiSuccess(created, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
