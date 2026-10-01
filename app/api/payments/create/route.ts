import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { paymentService, CreatePaymentSchema } from "@/modules/payments";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * POST /api/payments/create
 * Initiates an authoritative payment order for Phase 17 checkout.
 * Zero-trust: Customer ID, cart, and amount are derived strictly server-side.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const parseResult = CreatePaymentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid payment initiation payload",
        parseResult.error.flatten().fieldErrors
      );
    }

    const paymentInit = await paymentService.initiatePayment(
      customerId,
      parseResult.data
    );

    return apiSuccess(paymentInit, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
