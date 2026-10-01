/**
 * VÉRONA — Admin Notification Statistics API Route
 *
 * GET /api/admin/notifications/stats — Real-time metrics on delivery attempts, unread counts, and channels.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET() {
  try {
    await requireAnyPermission([
      PERMISSIONS.NOTIFICATIONS_READ,
      PERMISSIONS.NOTIFICATIONS_MANAGE,
    ]);

    const stats = await notificationService.getDeliveryStats();

    return apiSuccess(stats, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
