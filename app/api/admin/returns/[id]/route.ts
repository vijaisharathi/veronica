import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { returnRepository, returnService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";

import { IStaff } from "@/types/database";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/returns/[id]
 * Retrieves comprehensive operational return details.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.RETURNS_READ,
      PERMISSIONS.RETURNS_MANAGE,
      PERMISSIONS.RETURNS_REVIEW,
      PERMISSIONS.RETURNS_RECEIVE,
      PERMISSIONS.RETURNS_INSPECT,
    ]);

    const { id } = await context.params;
    const returnReq = await returnRepository.findById(id);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", id);
    }

    if (returnReq.warehouseId) {
      returnService.assertWarehouseScope(returnReq.warehouseId.toString(), staff as unknown as IStaff);
    }

    const adminDto = returnService.mapToAdminDto(returnReq);

    return apiSuccess(adminDto, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
