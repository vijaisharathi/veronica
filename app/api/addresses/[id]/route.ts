import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { addressService } from "@/modules/addresses";
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
 * GET /api/addresses/[id]
 * Retrieves a single address verifying customer ownership.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;
    const address = await addressService.getAddress(customer._id.toString(), id);
    return apiSuccess(address, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * PATCH /api/addresses/[id]
 * Updates an existing address verifying customer ownership.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Prevent client identity spoofing
    delete body.customerId;
    delete body.userId;
    delete body.ownerId;

    const updated = await addressService.updateAddress(
      customer._id.toString(),
      id,
      body
    );
    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * DELETE /api/addresses/[id]
 * Soft-deletes an address and promotes deterministic replacement if deleted was default.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;
    const result = await addressService.deleteAddress(customer._id.toString(), id);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
