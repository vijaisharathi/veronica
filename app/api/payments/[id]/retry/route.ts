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
 * POST /api/payments/[id]/retry
 * Re-initiates payment for a failed attempt under the existing payment record.
 * Revalidates checkout context and creates a separate payment attempt.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const { id } = await context.params;

    const retryInit = await paymentService.retryPayment(
      customer._id.toString(),
      id
    );

    return apiSuccess(retryInit, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
