/**
 * VÉRONA — Customer Support Tickets API Route
 *
 * GET  /api/account/support — Query authenticated customer's support tickets with pagination.
 * POST /api/account/support — Create a new support ticket with anti-IDOR context validation and rate limiting.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError, TooManyRequestsError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { supportService } from "@/modules/support/services/support.service";
import { CreateCustomerTicketSchema } from "@/modules/support/validators/support.validators";
import { SupportCategory, SupportTicketStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const statusParam = searchParams.get("status") as SupportTicketStatus | null;
    const categoryParam = searchParams.get("category") as SupportCategory | null;

    const status = statusParam && Object.values(SupportTicketStatus).includes(statusParam) ? statusParam : undefined;
    const category = categoryParam && Object.values(SupportCategory).includes(categoryParam) ? categoryParam : undefined;

    const result = await supportService.getCustomerTickets(customerId, {
      page,
      limit,
      status,
      category,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const customerEmail = customer.email;

    // Rate Limiting: Max 5 tickets per 10 minutes per customer
    const rateCheck = checkRateLimit(`support_create_${customerId}`, 5, 10 * 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError(
        "You have submitted multiple support tickets recently. Please wait a few minutes before submitting another."
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
    const body = await request.json().catch(() => ({}));

    const parsed = CreateCustomerTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid ticket payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const ticket = await supportService.createTicket({
      customerId,
      customerEmail,
      input: parsed.data,
      idempotencyKey,
    });

    return apiSuccess(ticket, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
