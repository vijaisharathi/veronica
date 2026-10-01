import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { orderService, CreateOrderSchema } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * POST /api/orders
 * Converts a server-verified captured payment into an authoritative, immutable Order.
 * Anti-tamper: All item pricing and customer identities are server-derived.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const parseResult = CreateOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid order creation request payload",
        parseResult.error.flatten().fieldErrors
      );
    }

    const order = await orderService.createOrderFromPayment(
      customerId,
      parseResult.data
    );

    return apiSuccess(order, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * GET /api/orders
 * Returns paginated order history for the authenticated customer.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const result = await orderService.getCustomerOrders(customerId, { page, limit });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
