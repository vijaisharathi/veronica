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
 * POST /api/checkout/[id]/payment-ready
 * Produces the locked, authoritative PaymentReadyCheckout contract for Phase 18.
 * Guarantees zero client-submitted pricing/totals, valid address, and confirmed serviceability.
 * Anti-IDOR: Ownership verified against authenticated customer identity.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const paymentReadyContract = await checkoutService.getPaymentReadyContract(
      customer._id.toString(),
      id
    );

    return apiSuccess({ paymentReadyCheckout: paymentReadyContract }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
