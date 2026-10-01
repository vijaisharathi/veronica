/**
 * VÉRONA — Customer Ticket Reply API Route
 *
 * POST /api/account/support/:ticketNumber/messages — Send a customer reply to an active support ticket.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError, TooManyRequestsError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { supportService } from "@/modules/support/services/support.service";
import { CustomerReplySchema } from "@/modules/support/validators/support.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ ticketNumber: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { ticketNumber } = await context.params;

    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    // Rate Limiting: Max 20 replies per 10 minutes
    const rateCheck = checkRateLimit(`support_reply_${customerId}`, 20, 10 * 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError(
        "You are sending replies too quickly. Please pause for a moment before trying again."
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
    const body = await request.json().catch(() => ({}));

    const parsed = CustomerReplySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid message payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const message = await supportService.addCustomerReply({
      customerId,
      ticketNumber,
      input: parsed.data,
      idempotencyKey,
    });

    return apiSuccess(message, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
