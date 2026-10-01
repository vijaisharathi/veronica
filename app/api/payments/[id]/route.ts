import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { paymentService } from "@/modules/payments";
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
 * GET /api/payments/[id]
 * Retrieves payment status with customer ownership verification.
 * Anti-IDOR: Derives authenticated customer identity and prevents cross-customer leakage.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const paymentStatus = await paymentService.getPaymentStatus(
      customer._id.toString(),
      id
    );

    return apiSuccess(paymentStatus, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
