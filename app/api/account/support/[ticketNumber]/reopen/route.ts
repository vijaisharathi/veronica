/**
 * VÉRONA — Customer Ticket Reopen API Route
 *
 * POST /api/account/support/:ticketNumber/reopen — Customer-initiated ticket reopening within policy.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError, TooManyRequestsError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { supportService } from "@/modules/support/services/support.service";
import { ReopenTicketSchema } from "@/modules/support/validators/support.validators";

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

    // Rate Limiting: Max 5 reopens per hour
    const rateCheck = checkRateLimit(`support_reopen_${customerId}`, 5, 60 * 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError("Too many reopen attempts. Please try again later.");
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ReopenTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid reopen payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await supportService.customerReopenTicket({
      customerId,
      ticketNumber,
      reason: parsed.data.reason,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
