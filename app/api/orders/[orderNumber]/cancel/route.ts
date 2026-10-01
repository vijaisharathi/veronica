import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { orderService, CancelOrderSchema } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ orderNumber: string }>;
}

/**
 * POST /api/orders/[orderNumber]/cancel
 * Customer self-service cancellation foundation.
 * Allowed only while order is in CONFIRMED state.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { orderNumber } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parseResult = CancelOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid cancellation payload",
        parseResult.error.flatten().fieldErrors
      );
    }

    const cancelledOrder = await orderService.cancelOrder(
      customerId,
      orderNumber,
      parseResult.data
    );

    return apiSuccess(cancelledOrder, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
