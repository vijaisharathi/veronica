/**
 * VÉRONA — Admin Notification Detail API Route
 *
 * GET /api/admin/notifications/[id] — Retrieve single notification with full delivery audit trail.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAnyPermission([
      PERMISSIONS.NOTIFICATIONS_READ,
      PERMISSIONS.NOTIFICATIONS_MANAGE,
    ]);

    const { id } = await params;
    const notification = await notificationService.getAdminNotificationById(id);

    if (!notification) {
      throw new NotFoundError(`Notification #${id} not found`);
    }

    return apiSuccess(notification, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
