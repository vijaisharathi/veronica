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
 * POST /api/checkout/[id]/validate
 * Executes authoritative, multi-entity checkout validation.
 * Verifies bag non-empty, product/variant availability, live pricing integrity,
 * coupon validity, delivery address, and delivery serviceability.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const validationResult = await checkoutService.validateCheckout(
      customer._id.toString(),
      id
    );

    return apiSuccess(validationResult, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
