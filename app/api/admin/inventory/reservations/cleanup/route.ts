import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { reservationService } from "@/modules/inventory/services/reservation.service";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inventory/reservations/cleanup
 * Reaps expired active reservations, returning reserved stock to availability.
 * RBAC: Requires INVENTORY_MANAGE or INVENTORY_UPDATE permission.
 */
export async function POST() {
  try {
    await requireAnyPermission([
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_UPDATE,
    ]);

    const result = await reservationService.cleanupExpiredReservations();

    return apiSuccess({
      message: `Cleaned up ${result.expiredCount} expired reservations`,
      expiredCount: result.expiredCount,
    });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
