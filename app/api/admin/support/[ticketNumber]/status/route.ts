/**
 * VÉRONA — Admin Support Ticket Status API Route
 *
 * POST /api/admin/support/:ticketNumber/status — Controlled state machine status transition by authorized staff.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";
import { UpdateTicketStatusSchema } from "@/modules/support/validators/support.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ ticketNumber: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SUPPORT_UPDATE,
      PERMISSIONS.SUPPORT_CLOSE,
      PERMISSIONS.SUPPORT_REOPEN,
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const { ticketNumber } = await context.params;
    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const body = await request.json().catch(() => ({}));

    const parsed = UpdateTicketStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid status payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const actorId = staff._id.toString();
    const actorEmail = staff.email;

    const updatedTicket = await supportService.updateTicketStatus({
      actorId,
      actorEmail,
      ticketNumber,
      input: parsed.data,
    });

    return apiSuccess(updatedTicket, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
