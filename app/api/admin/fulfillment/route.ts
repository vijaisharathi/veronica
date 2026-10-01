import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { FulfillmentStatus } from "@/constants/status";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import {
  createFulfillmentSchema,
  fulfillmentFilterSchema,
} from "@/modules/fulfillment/validators/fulfillment.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/fulfillment
 * List fulfillments with search, status filtering, and pagination.
 * RBAC: FULFILLMENT_READ or FULFILLMENT_MANAGE.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_READ,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const filterInput = {
      warehouseId: searchParams.get("warehouseId") || undefined,
      status: (searchParams.get("status") as FulfillmentStatus) || undefined,
      orderId: searchParams.get("orderId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
    };

    const parsed = fulfillmentFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid filter parameters",
        parsed.error.flatten().fieldErrors
      );
    }

    const { page, limit, ...filters } = parsed.data;
    const [result, stats] = await Promise.all([
      fulfillmentService.listFulfillments(filters, { page, limit }, staff),
      fulfillmentService.getFulfillmentStats(filters.warehouseId, staff),
    ]);

    return apiSuccess({ ...result, stats }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/admin/fulfillment
 * Create a new fulfillment order for an existing confirmed order.
 * RBAC: FULFILLMENT_ALLOCATE or FULFILLMENT_MANAGE.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.FULFILLMENT_ALLOCATE,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const body = await request.json().catch(() => ({}));
    const parsed = createFulfillmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid fulfillment creation payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const fulfillment = await fulfillmentService.createFulfillment(parsed.data, staff);
    return apiSuccess({ fulfillment }, { status: 201 });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
