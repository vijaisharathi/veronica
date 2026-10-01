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
 * PATCH /api/addresses/[id]/default
 * Atomically marks this address as the default address for the authenticated customer.
 */
export async function PATCH(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;
    const updated = await addressService.setDefaultAddress(customer._id.toString(), id);
    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
