/**
 * VÉRONA — Admin Support Agent Reply API Route
 *
 * POST /api/admin/support/:ticketNumber/messages — Send a staff reply to customer, recording first response timestamp.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";
import { AgentReplySchema } from "@/modules/support/validators/support.validators";

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
      PERMISSIONS.SUPPORT_REPLY,
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const { ticketNumber } = await context.params;
    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
    const body = await request.json().catch(() => ({}));

    const parsed = AgentReplySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid reply payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const agentId = staff._id.toString();
    const agentEmail = staff.email;

    const message = await supportService.addAgentReply({
      agentId,
      agentEmail,
      ticketNumber,
      input: parsed.data,
      idempotencyKey,
    });

    return apiSuccess(message, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
