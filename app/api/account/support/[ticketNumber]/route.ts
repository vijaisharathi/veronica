/**
 * VÉRONA — Customer Ticket Detail API Route
 *
 * GET /api/account/support/:ticketNumber — Retrieve ticket details with customer-safe messages and context previews.
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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { ticketNumber } = await context.params;

    if (!ticketNumber) {
      throw new NotFoundError("Ticket number is required");
    }

    const ticketDetail = await supportService.getCustomerTicket(customerId, ticketNumber);

    return apiSuccess(ticketDetail, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
