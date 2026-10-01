import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/shipments/[id]
 * Retrieve full shipment details and chronological tracking history.
 * RBAC: SHIPMENTS_TRACK or SHIPMENTS_MANAGE.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SHIPMENTS_TRACK,
      PERMISSIONS.SHIPMENTS_MANAGE,
    ]);

    const { id } = await params;
    const shipment = await shipmentService.getShipmentById(id);
    shipmentService.assertWarehouseScope(shipment.warehouseId, staff);

    return apiSuccess({ shipment }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
