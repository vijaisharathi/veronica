import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { fulfillmentRepository } from "@/modules/fulfillment/repositories/fulfillment.repository";
import { createShipmentSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/fulfillment/[id]/shipments
 * List all shipments generated for this fulfillment.
 * RBAC: SHIPMENTS_TRACK, FULFILLMENT_READ, SHIPMENTS_MANAGE, or FULFILLMENT_MANAGE.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SHIPMENTS_TRACK,
      PERMISSIONS.FULFILLMENT_READ,
      PERMISSIONS.SHIPMENTS_MANAGE,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const fulfillment = await fulfillmentService.getFulfillmentById(id);
    fulfillmentService.assertWarehouseScope(fulfillment.warehouseId, staff);

    const shipments = await fulfillmentRepository.findShipmentsByFulfillmentId(id);
    return apiSuccess({ shipments });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/admin/fulfillment/[id]/shipments
 * Create a new carrier shipment for a packed package.
 * RBAC: SHIPMENTS_CREATE, SHIPMENTS_MANAGE, or FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.SHIPMENTS_CREATE,
      PERMISSIONS.SHIPMENTS_MANAGE,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const idempotencyHeader = request.headers.get("Idempotency-Key") || undefined;
    const body = await request.json().catch(() => ({}));
    const parsed = createShipmentSchema.safeParse({
      ...body,
      idempotencyKey: body.idempotencyKey || idempotencyHeader,
    });

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid shipment creation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const shipment = await fulfillmentService.createShipment(
      {
        fulfillmentId: id,
        packageId: parsed.data.packageId,
        serviceLevel: parsed.data.serviceLevel,
        idempotencyKey: parsed.data.idempotencyKey,
      },
      staff
    );

    return apiSuccess({ shipment }, { status: 201 });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
