import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { warehouseService } from "@/modules/inventory/services/warehouse.service";
import { updateWarehouseSchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/warehouses/[id]
 * Get detailed information for a single warehouse.
 * RBAC: Requires WAREHOUSES_READ or WAREHOUSES_MANAGE.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAnyPermission([
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.WAREHOUSES_MANAGE,
    ]);

    const { id } = await context.params;
    const warehouse = await warehouseService.getWarehouseById(id);

    return apiSuccess({ warehouse }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * PATCH /api/admin/warehouses/[id]
 * Update warehouse contact, address, operating status, or active state.
 * RBAC: Requires WAREHOUSES_UPDATE or WAREHOUSES_MANAGE.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAnyPermission([
      PERMISSIONS.WAREHOUSES_UPDATE,
      PERMISSIONS.WAREHOUSES_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = updateWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid warehouse update payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await warehouseService.updateWarehouse(id, parsed.data);

    return apiSuccess({
      message: "Warehouse updated successfully",
      warehouse: updated,
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
