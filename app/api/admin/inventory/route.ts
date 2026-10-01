import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { inventoryQuerySchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/inventory
 * Admin list inventory items across warehouses with status, stock levels, and search.
 * RBAC: Requires INVENTORY_READ or INVENTORY_MANAGE permission.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_MANAGE,
    ]);

    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      warehouseId: searchParams.get("warehouseId") || undefined,
      productId: searchParams.get("productId") || undefined,
      status: searchParams.get("status") || undefined,
      lowStockOnly: searchParams.get("lowStockOnly") || undefined,
      outOfStockOnly: searchParams.get("outOfStockOnly") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parsed = inventoryQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid inventory query parameters",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await inventoryService.listInventory(parsed.data);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
