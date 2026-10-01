import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { cancelFulfillmentSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/fulfillment/[id]/cancel
 * Cancel a fulfillment order in an eligible pre-operational state.
 * RBAC: FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.FULFILLMENT_MANAGE);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = cancelFulfillmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid cancellation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const fulfillment = await fulfillmentService.cancelFulfillment(id, parsed.data.reason, staff);
    return apiSuccess({ fulfillment });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
