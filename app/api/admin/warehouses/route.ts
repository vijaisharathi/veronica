import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { WarehouseStatus } from "@/constants/status";
import { warehouseService } from "@/modules/inventory/services/warehouse.service";
import { createWarehouseSchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/warehouses
 * List all warehouses with operational and inventory stats.
 * RBAC: Requires WAREHOUSES_READ, WAREHOUSES_MANAGE, or INVENTORY_READ permission.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.WAREHOUSES_MANAGE,
      PERMISSIONS.INVENTORY_READ,
    ]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as WarehouseStatus) || undefined;

    const warehouses = await warehouseService.listWarehouses({ search, status });

    return apiSuccess({ warehouses }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/admin/warehouses
 * Create a new warehouse with unique code and address details.
 * RBAC: Requires WAREHOUSES_CREATE or WAREHOUSES_MANAGE permission.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.WAREHOUSES_CREATE,
      PERMISSIONS.WAREHOUSES_MANAGE,
    ]);

    const body = await request.json().catch(() => ({}));
    const parsed = createWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid warehouse creation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const warehouse = await warehouseService.createWarehouse(parsed.data);

    return apiSuccess(
      {
        message: "Warehouse created successfully",
        warehouse,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
