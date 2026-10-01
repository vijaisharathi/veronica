import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { ShipmentStatus } from "@/constants/status";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { shipmentFilterSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/shipments
 * List shipments with carrier, status, order, or AWB filtering.
 * RBAC: SHIPMENTS_TRACK or SHIPMENTS_MANAGE.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SHIPMENTS_TRACK,
      PERMISSIONS.SHIPMENTS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const filterInput = {
      warehouseId: searchParams.get("warehouseId") || undefined,
      status: (searchParams.get("status") as ShipmentStatus) || undefined,
      orderId: searchParams.get("orderId") || undefined,
      awbNumber: searchParams.get("awbNumber") || undefined,
      provider: searchParams.get("provider") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
    };

    const parsed = shipmentFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid filter parameters",
        parsed.error.flatten().fieldErrors
      );
    }

    const { page, limit, ...filters } = parsed.data;
    const result = await shipmentService.listShipments(filters, { page, limit }, staff);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
