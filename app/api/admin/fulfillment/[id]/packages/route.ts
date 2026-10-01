import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { createPackageSchema } from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/fulfillment/[id]/packages
 * List all packages created for a fulfillment.
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

    const packages = await fulfillmentService.getPackagesByFulfillmentId(id);
    return apiSuccess({ packages });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/admin/fulfillment/[id]/packages
 * Create a new physical package for a fulfillment order.
 * RBAC: FULFILLMENT_PACK or FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_PACK,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = createPackageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid package creation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const pkg = await fulfillmentService.createPackage(
      {
        fulfillmentId: id,
        items: parsed.data.items,
        weightGrams: parsed.data.weightGrams,
        lengthMm: parsed.data.lengthMm,
        widthMm: parsed.data.widthMm,
        heightMm: parsed.data.heightMm,
        actor: staff.email,
      },
      staff
    );

    return apiSuccess({ package: pkg }, { status: 201 });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
