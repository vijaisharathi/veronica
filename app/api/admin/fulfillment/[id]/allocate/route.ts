import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { allocateFulfillmentSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/fulfillment/[id]/allocate
 * Explicitly allocate fulfillment to a warehouse.
 * RBAC: FULFILLMENT_ALLOCATE or FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_ALLOCATE,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = allocateFulfillmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid allocation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    if (!parsed.data.warehouseId) {
      throw new ValidationError("Warehouse ID is required for allocation");
    }

    const fulfillment = await fulfillmentService.allocate(id, parsed.data.warehouseId, staff);
    return apiSuccess({ fulfillment });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
