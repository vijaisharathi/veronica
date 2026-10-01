import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { refundService } from "@/modules/refunds";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/account/refunds
 * List all refunds belonging to the authenticated customer.
 * Strict Anti-IDOR: Scoped exclusively to session customerId.
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await refundService.getCustomerRefunds(customerId, {
      page,
      limit,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
