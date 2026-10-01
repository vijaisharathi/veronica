import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { checkoutService, SelectCheckoutAddressSchema } from "@/modules/checkout";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/checkout/[id]/address
 * Selects or switches the delivery destination address for the checkout session.
 * Revalidates delivery serviceability immediately upon address selection.
 * Anti-IDOR: Validates that both the checkout session and the selected address belong to the customer.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parseResult = SelectCheckoutAddressSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid address selection data",
        parseResult.error.flatten().fieldErrors
      );
    }

    const { addressId } = parseResult.data;
    const checkout = await checkoutService.selectAddress(
      customer._id.toString(),
      id,
      addressId
    );

    return apiSuccess(checkout, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
