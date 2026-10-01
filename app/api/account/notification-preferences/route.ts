/**
 * VÉRONA — Customer Notification Preferences API Route
 *
 * GET   /api/account/notification-preferences — Retrieve current notification settings.
 * PATCH /api/account/notification-preferences — Update channel & category preferences (enforces security invariants).
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(_request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const preferences = await notificationService.getPreferences(customerId);

    return apiSuccess(preferences, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));

    // Server-side guard: Prevent unauthorized attempt to turn off security alerts
    if ("securityAlerts" in body && body.securityAlerts === false) {
      throw new ValidationError(
        "Security and authentication alerts are mandatory and cannot be disabled."
      );
    }

    const updated = await notificationService.updatePreferences(customerId, {
      email: typeof body.email === "boolean" ? body.email : undefined,
      sms: typeof body.sms === "boolean" ? body.sms : undefined,
      push: typeof body.push === "boolean" ? body.push : undefined,
      whatsapp: typeof body.whatsapp === "boolean" ? body.whatsapp : undefined,
      inApp: typeof body.inApp === "boolean" ? body.inApp : undefined,
      orderUpdates: typeof body.orderUpdates === "boolean" ? body.orderUpdates : undefined,
      paymentUpdates: typeof body.paymentUpdates === "boolean" ? body.paymentUpdates : undefined,
      shippingUpdates: typeof body.shippingUpdates === "boolean" ? body.shippingUpdates : undefined,
      returnRefundUpdates: typeof body.returnRefundUpdates === "boolean" ? body.returnRefundUpdates : undefined,
      reviewUpdates: typeof body.reviewUpdates === "boolean" ? body.reviewUpdates : undefined,
      marketing: typeof body.marketing === "boolean" ? body.marketing : undefined,
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
