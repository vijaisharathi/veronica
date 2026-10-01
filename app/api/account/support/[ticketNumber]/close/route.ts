/**
 * VÉRONA — Customer Ticket Close API Route
 *
 * POST /api/account/support/:ticketNumber/close — Customer-initiated ticket closure.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { ticketNumber } = await context.params;

    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : "Closed by customer";

    const result = await supportService.customerCloseTicket({
      customerId,
      ticketNumber,
      reason,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
