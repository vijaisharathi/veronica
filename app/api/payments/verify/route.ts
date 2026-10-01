import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { paymentService, VerifyPaymentSchema } from "@/modules/payments";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * POST /api/payments/verify
 * Cryptographically verifies Razorpay Checkout client signature callback.
 * Anti-tamper: Evaluates HMAC SHA-256 signature against server key secret.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const parseResult = VerifyPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid payment verification payload",
        parseResult.error.flatten().fieldErrors
      );
    }

    const verification = await paymentService.verifyPayment(
      customerId,
      parseResult.data
    );

    return apiSuccess(verification, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
