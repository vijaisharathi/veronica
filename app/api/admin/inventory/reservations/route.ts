import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { inventoryRepository } from "@/modules/inventory/repositories/inventory.repository";
import { reservationQuerySchema } from "@/modules/inventory/validators/inventory.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/inventory/reservations
 * Admin list active, expired, and consumed stock reservations.
 * RBAC: Requires INVENTORY_READ or INVENTORY_MANAGE permission.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_MANAGE,
    ]);

    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      warehouseId: searchParams.get("warehouseId") || undefined,
      variantId: searchParams.get("variantId") || undefined,
      status: searchParams.get("status") || undefined,
      referenceId: searchParams.get("referenceId") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parsed = reservationQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid reservation query parameters",
        parsed.error.flatten().fieldErrors
      );
    }

    const page = parsed.data.page;
    const limit = parsed.data.limit;
    const skip = (page - 1) * limit;

    const { reservations, total } = await inventoryRepository.listReservations({
      warehouseId: parsed.data.warehouseId,
      variantId: parsed.data.variantId,
      status: parsed.data.status,
      referenceId: parsed.data.referenceId,
      skip,
      limit,
    });

    const dtos = reservations.map((res) => ({
      id: res._id.toString(),
      reservationId: res.reservationId,
      referenceType: res.referenceType,
      referenceId: res.referenceId,
      variantId: res.variantId.toString(),
      warehouseId: res.warehouseId.toString(),
      quantity: res.quantity,
      status: res.status,
      expiresAt: res.expiresAt.toISOString(),
      releasedAt: res.releasedAt ? res.releasedAt.toISOString() : null,
      consumedAt: res.consumedAt ? res.consumedAt.toISOString() : null,
      createdAt: res.createdAt ? res.createdAt.toISOString() : new Date().toISOString(),
    }));

    return apiSuccess(
      {
        reservations: dtos,
        total,
        page,
        limit,
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
