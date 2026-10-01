import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { returnService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { ReturnStatus, ReturnType, ReturnReason } from "@/constants/status";
import { IStaff } from "@/types/database";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/returns
 * List all return requests with operational filtering, searching, and server-side pagination.
 * RBAC: Requires RETURNS_READ, RETURNS_MANAGE, or RETURNS_REVIEW.
 * Warehouse-scoped for warehouse staff.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.RETURNS_READ,
      PERMISSIONS.RETURNS_MANAGE,
      PERMISSIONS.RETURNS_REVIEW,
      PERMISSIONS.RETURNS_RECEIVE,
      PERMISSIONS.RETURNS_INSPECT,
    ]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as ReturnStatus) || undefined;
    const type = (searchParams.get("type") as ReturnType) || undefined;
    const orderId = searchParams.get("orderId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const reason = (searchParams.get("reason") as ReturnReason) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await returnService.findReturnsAdmin(
      {
        search,
        status,
        type,
        orderId,
        customerId,
        warehouseId,
        reason,
        page,
        limit,
      },
      staff as unknown as IStaff
    );

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
