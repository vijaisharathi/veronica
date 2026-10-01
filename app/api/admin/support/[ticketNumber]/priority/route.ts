/**
 * VÉRONA — Admin Support Ticket Priority API Route
 *
 * POST /api/admin/support/:ticketNumber/priority — Override ticket priority and adjust SLA thresholds.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";
import { UpdateTicketPrioritySchema } from "@/modules/support/validators/support.validators";

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
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const { ticketNumber } = await context.params;
    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const body = await request.json().catch(() => ({}));

    const parsed = UpdateTicketPrioritySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid priority payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const actorId = staff._id.toString();
    const actorEmail = staff.email;

    const updatedTicket = await supportService.updateTicketPriority({
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
