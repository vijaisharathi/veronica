/**
 * VÉRONA — Admin Support Ticket Detail API Route
 *
 * GET /api/admin/support/:ticketNumber — Full operational view of ticket, customer context, SLA, and internal messages.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ ticketNumber: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAnyPermission([
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const { ticketNumber } = await context.params;
    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const detail = await supportService.getAdminTicket(ticketNumber);

    return apiSuccess(detail, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
