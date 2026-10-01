import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { OrderStatus } from "@/constants/status";
import { orderService, OrderQuerySchema } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/orders
 * Admin list orders with pagination, status filtering, and search.
 * RBAC: Requires ORDERS_READ permission.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ);

    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const parseResult = OrderQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid order query parameters",
        parseResult.error.flatten().fieldErrors
      );
    }

    const { page, limit, status, search, startDate, endDate } = parseResult.data;

    const result = await orderService.getAdminOrders(
      {
        status: status as OrderStatus | undefined,
        search,
        startDate,
        endDate,
      },
      { page, limit }
    );

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
