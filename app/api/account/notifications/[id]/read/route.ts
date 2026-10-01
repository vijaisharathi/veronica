/**
 * VÉRONA — Mark Notification As Read API Route
 *
 * POST /api/account/notifications/[id]/read — Marks notification as read with strict ownership check.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { notificationService } from "@/modules/notifications";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { id } = await params;

    const result = await notificationService.markNotificationRead(id, customerId);

    if (!result.found) {
      throw new NotFoundError("Notification not found or unauthorized");
    }

    return apiSuccess({ success: true, notificationId: id });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
