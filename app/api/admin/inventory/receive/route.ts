import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { receiveStockSchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inventory/receive
 * Atomically receives stock into a warehouse for a product variant.
 * RBAC: Requires INVENTORY_RECEIVE, INVENTORY_UPDATE, or INVENTORY_MANAGE permission.
 * Enforces server-side warehouse scoping for warehouse staff.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.INVENTORY_RECEIVE,
      PERMISSIONS.INVENTORY_UPDATE,
      PERMISSIONS.INVENTORY_MANAGE,
    ]);

    const body = await request.json().catch(() => ({}));
    const parsed = receiveStockSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid stock receiving payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updatedItem = await inventoryService.receiveStock(parsed.data, staff);

    return apiSuccess({
      message: "Stock successfully received into warehouse",
      item: updatedItem,
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
