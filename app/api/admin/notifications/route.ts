/**
 * VÉRONA — Admin Notifications API Route
 *
 * GET /api/admin/notifications — Query notifications across all customers with filters and attempts.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";
import {
  NotificationType,
  NotificationCategory,
  NotificationStatus,
  NotificationChannel,
} from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.NOTIFICATIONS_READ,
      PERMISSIONS.NOTIFICATIONS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const customerId = searchParams.get("customerId") || undefined;
    const type = (searchParams.get("type") as NotificationType) || undefined;
    const category = (searchParams.get("category") as NotificationCategory) || undefined;
    const status = (searchParams.get("status") as NotificationStatus) || undefined;
    const channel = (searchParams.get("channel") as NotificationChannel) || undefined;
    const search = searchParams.get("search") || undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await notificationService.getAdminNotifications({
      page,
      limit,
      customerId,
      type,
      category,
      status,
      channel,
      search,
      unreadOnly,
      startDate,
      endDate,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
