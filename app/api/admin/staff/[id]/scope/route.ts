/**
 * VÉRONA — Admin Staff Warehouse Scope API
 *
 * PATCH /api/admin/staff/:id/scope — Assign or modify warehouse operational scope.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import { AdminStaffScopeUpdateSchema } from "@/modules/admin/validators/admin-staff.validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.STAFF_SCOPE_MANAGE);
    const { id } = await params;
    const body = await request.json();
    const input = AdminStaffScopeUpdateSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminStaffService.updateStaffScope(id, input, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
