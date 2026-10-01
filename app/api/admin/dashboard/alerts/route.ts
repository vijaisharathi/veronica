/**
 * VÉRONA — Admin Operational Alerts Endpoint (Phase 27)
 *
 * GET /api/admin/dashboard/alerts — Evaluates and returns real-time operational alerts.
 */

import { NextRequest } from "next/server";
import { requireStaff, getEffectivePermissions } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { InsufficientPermissionError } from "@/lib/errors";
import { apiSuccess, apiError } from "@/lib/response";
import { adminAlertService } from "@/modules/admin/services/admin-alert.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET() {
  try {
    const staff = await requireStaff();
    const permissions = await getEffectivePermissions(staff);

    if (!permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
      throw new InsufficientPermissionError(
        PERMISSIONS.DASHBOARD_READ,
        "Access denied: Dashboard alerts require admin.dashboard.read permission"
      );
    }

    const assignedWarehouseId = staff.assignedWarehouseId?.toString();
    const alerts = await adminAlertService.evaluateAlerts(permissions, assignedWarehouseId);

    return apiSuccess({ alerts }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
