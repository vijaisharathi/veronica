import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { exchangeService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ exchangeNumber: string }>;
}

/**
 * GET /api/account/exchanges/[exchangeNumber]
 * Customer views their exchange request progress and replacement details.
 * Anti-IDOR: Enforces customer ownership.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { exchangeNumber } = await context.params;

    const exchange = await exchangeService.getExchangeForCustomer(exchangeNumber, customerId);

    return apiSuccess(exchange, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
