import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { adjustStockSchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inventory/adjust
 * Atomically adjusts stock with structured reason and audit trail.
 * RBAC: Requires INVENTORY_ADJUST, INVENTORY_UPDATE, or INVENTORY_MANAGE permission.
 * Enforces server-side warehouse scoping for warehouse staff.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_UPDATE,
      PERMISSIONS.INVENTORY_MANAGE,
    ]);

    const body = await request.json().catch(() => ({}));
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid stock adjustment payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updatedItem = await inventoryService.adjustStock(parsed.data, staff);

    return apiSuccess({
      message: "Stock successfully adjusted",
      item: updatedItem,
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
