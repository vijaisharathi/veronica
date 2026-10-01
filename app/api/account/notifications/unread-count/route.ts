/**
 * VÉRONA — Customer Notifications Unread Count API Route
 *
 * GET /api/account/notifications/unread-count — Efficient unread and total summary count.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(_request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const summary = await notificationService.getCustomerSummary(customerId);

    return apiSuccess(summary, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
