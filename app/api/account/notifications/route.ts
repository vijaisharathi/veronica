/**
 * VÉRONA — Customer Notifications API Route
 *
 * GET /api/account/notifications — Paginated list of customer in-app notifications.
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

export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await notificationService.getCustomerNotifications(customerId, {
      page,
      limit,
      unreadOnly,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
