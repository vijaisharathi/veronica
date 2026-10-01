import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { confirmPickSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/fulfillment/[id]/confirm-pick
 * Confirm picked items and transition fulfillment to PICKED.
 * RBAC: FULFILLMENT_PICK or FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_PICK,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = confirmPickSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid pick confirmation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const fulfillment = await fulfillmentService.confirmPick(
      {
        fulfillmentId: id,
        pickedItems: parsed.data.pickedItems,
        actor: staff.email,
      },
      staff
    );

    return apiSuccess({ fulfillment });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
