/**
 * VÉRONA — Mark All Notifications As Read API Route
 *
 * POST /api/account/notifications/read-all — Marks all customer notifications as read.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const result = await notificationService.markAllNotificationsRead(customerId);

    return apiSuccess({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
