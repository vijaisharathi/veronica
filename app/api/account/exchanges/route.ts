import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { exchangeService } from "@/modules/returns";
import { CreateExchangeRequestSchema } from "@/modules/returns/validators/return.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * POST /api/account/exchanges
 * Customer requests a size/color exchange for a purchased garment item.
 */
export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const parsed = CreateExchangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid exchange request payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const exchange = await exchangeService.createExchangeRequest(parsed.data, customerId);

    return apiSuccess(exchange, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
