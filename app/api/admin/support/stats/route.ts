/**
 * VÉRONA — Admin Support Queue Metrics API Route
 *
 * GET /api/admin/support/stats — Aggregated operational metrics for support management.
 */

import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET() {
  try {
    await requireAnyPermission([
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_ANALYTICS_READ,
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const stats = await supportService.getAdminStats();

    return apiSuccess(stats, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
