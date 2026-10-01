import { NextRequest, NextResponse } from "next/server";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError, AuthenticationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/shipping
 * Ingestion endpoint for shipping carrier tracking status updates.
 * Verifies carrier signature against raw unparsed payload and ensures strict event idempotency.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const provider = (
      request.headers.get("x-shipping-provider") ||
      searchParams.get("provider") ||
      process.env.SHIPPING_PROVIDER ||
      "MANUAL"
    ).toUpperCase();

    const signature =
      request.headers.get("x-shipping-signature") ||
      request.headers.get("x-carrier-signature") ||
      request.headers.get("x-provider-signature") ||
      "";

    const rawPayload = await request.text();
    if (!rawPayload) {
      throw new ValidationError("Empty webhook payload received");
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      throw new ValidationError("Invalid JSON payload in webhook body");
    }

    const result = await shipmentService.processShippingWebhook(
      provider,
      signature,
      rawPayload,
      payload
    );

    if (!result.success && result.error === "Invalid webhook signature") {
      throw new AuthenticationError("Invalid shipping webhook signature");
    }

    return apiSuccess(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
