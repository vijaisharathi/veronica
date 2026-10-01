import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { exchangeService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { ExchangeStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/exchanges
 * List all exchange requests with filtering and pagination.
 * RBAC: Requires EXCHANGES_READ or EXCHANGES_MANAGE.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.EXCHANGES_READ,
      PERMISSIONS.EXCHANGES_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as ExchangeStatus) || undefined;
    const orderId = searchParams.get("orderId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await exchangeService.findExchangesAdmin({
      search,
      status,
      orderId,
      customerId,
      page,
      limit,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
