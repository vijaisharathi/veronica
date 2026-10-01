import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { fulfillmentRepository } from "@/modules/fulfillment/repositories/fulfillment.repository";
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
 * GET /api/admin/fulfillment/[id]
 * Retrieve full fulfillment details including packages and shipments.
 * RBAC: FULFILLMENT_READ or FULFILLMENT_MANAGE.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_READ,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const fulfillment = await fulfillmentService.getFulfillmentById(id);
    fulfillmentService.assertWarehouseScope(fulfillment.warehouseId, staff);

    const [packages, shipments] = await Promise.all([
      fulfillmentService.getPackagesByFulfillmentId(id),
      fulfillmentRepository.findShipmentsByFulfillmentId(id),
    ]);

    return apiSuccess({ fulfillment, packages, shipments }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
