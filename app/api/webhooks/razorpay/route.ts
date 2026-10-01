import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/modules/payments";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/razorpay
 * Authoritative Webhook endpoint for Razorpay payment notifications.
 * Verifies HMAC SHA-256 signature against raw unparsed request payload.
 * Enforces strict event idempotency via provider + eventId uniqueness.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      throw new ValidationError("Missing x-razorpay-signature header");
    }

    const rawPayload = await request.text();
    if (!rawPayload) {
      throw new ValidationError("Empty webhook payload received");
    }

    const result = await paymentService.processWebhook(rawPayload, signature);

    return apiSuccess(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
