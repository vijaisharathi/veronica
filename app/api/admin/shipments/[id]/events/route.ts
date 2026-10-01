import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { updateShipmentStatusSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/shipments/[id]/events
 * Record an internal or manual tracking event and update status.
 * RBAC: SHIPMENTS_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.SHIPMENTS_MANAGE);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = updateShipmentStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid shipment event payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const event = await shipmentService.recordShipmentEvent(
      id,
      {
        status: parsed.data.status,
        providerStatus: parsed.data.providerStatus,
        location: parsed.data.location,
        description: parsed.data.description,
        source: parsed.data.source,
      },
      staff
    );

    return apiSuccess({ event }, { status: 201 });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
