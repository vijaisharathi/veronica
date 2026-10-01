import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/fulfillment/[id]/start-packing
 * Transition fulfillment status to PACKING.
 * RBAC: FULFILLMENT_PACK or FULFILLMENT_MANAGE.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_PACK,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const fulfillment = await fulfillmentService.startPacking(id, staff);
    return apiSuccess({ fulfillment });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
