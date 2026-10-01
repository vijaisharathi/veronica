import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { returnService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ returnNumber: string }>;
}

/**
 * POST /api/account/returns/[returnNumber]/cancel
 * Customer cancels an active return request before pickup.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { returnNumber } = await context.params;

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || "Cancelled by customer";

    const cancelled = await returnService.cancelReturnByCustomer(
      returnNumber,
      customerId,
      reason
    );

    return apiSuccess(cancelled, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
