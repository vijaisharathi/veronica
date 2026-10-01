/**
 * VÉRONA — Admin Dashboard Aggregation API Route (Phase 27)
 *
 * GET /api/admin/dashboard?range=TODAY — Retrieves permission-filtered operational overview,
 * KPI metrics, domain widgets, and active operational alerts.
 */

import { NextRequest } from "next/server";
import { requireStaff, getEffectivePermissions } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { InsufficientPermissionError } from "@/lib/errors";
import { apiSuccess, apiError } from "@/lib/response";
import { adminDashboardService } from "@/modules/admin/services/admin-dashboard.service";
import { DashboardRangeSchema } from "@/modules/admin/validators/admin.validators";
import { DateRangeOption } from "@/modules/admin/types/admin.types";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    const permissions = await getEffectivePermissions(staff);

    // Caller must have at least DASHBOARD_READ permission
    if (!permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
      throw new InsufficientPermissionError(
        PERMISSIONS.DASHBOARD_READ,
        "Access denied: Operational dashboard requires admin.dashboard.read permission"
      );
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "TODAY";
    const rangeParse = DashboardRangeSchema.safeParse(rangeParam);
    const range: DateRangeOption = rangeParse.success ? rangeParse.data : "TODAY";

    const dashboard = await adminDashboardService.getDashboard(staff, permissions, range);

    return apiSuccess(dashboard, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
