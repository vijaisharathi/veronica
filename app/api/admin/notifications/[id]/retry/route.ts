/**
 * VÉRONA — Admin Notification Delivery Attempt Retry API Route
 *
 * POST /api/admin/notifications/[id]/retry — Retries a failed channel delivery attempt.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.NOTIFICATIONS_RETRY,
      PERMISSIONS.NOTIFICATIONS_MANAGE,
    ]);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const attemptId = body.attemptId;

    if (!attemptId || typeof attemptId !== "string") {
      throw new ValidationError("Parameter 'attemptId' is required to retry delivery");
    }

    const outcome = await notificationService.retryDeliveryAttempt(attemptId, {
      id: staff._id.toString(),
      email: staff.email,
    });

    if (!outcome.success) {
      throw new ValidationError(outcome.error || "Retry execution failed");
    }

    return apiSuccess({
      success: true,
      notificationId: id,
      attemptId,
      message: "Delivery attempt retried successfully",
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
