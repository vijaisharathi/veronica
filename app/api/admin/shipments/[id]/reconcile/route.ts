import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/shipments/[id]/reconcile
 * Trigger synchronization of shipment events against the carrier API.
 * RBAC: SHIPMENTS_RECONCILE or SHIPMENTS_MANAGE.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SHIPMENTS_RECONCILE,
      PERMISSIONS.SHIPMENTS_MANAGE,
    ]);

    const { id } = await params;
    const result = await shipmentService.reconcileShipment(id, staff);
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
