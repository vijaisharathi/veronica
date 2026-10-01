import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { refundService } from "@/modules/refunds";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteParams {
  params: Promise<{ refundNumber: string }>;
}

/**
 * GET /api/account/refunds/[refundNumber]
 * Retrieve detailed customer refund with progress timeline.
 * Anti-IDOR: Validates that refund belongs to authenticated customer.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { refundNumber } = await params;

    const result = await refundService.getCustomerRefundDetail(refundNumber, customerId);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
