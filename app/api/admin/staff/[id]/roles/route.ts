/**
 * VÉRONA — Admin Staff Role Assignment API
 *
 * PATCH /api/admin/staff/:id/roles — Assign roles with self-escalation and last Super Admin guards.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import { AdminStaffRoleUpdateSchema } from "@/modules/admin/validators/admin-staff.validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.STAFF_ROLES_MANAGE);
    const { id } = await params;
    const body = await request.json();
    const input = AdminStaffRoleUpdateSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminStaffService.updateStaffRoles(id, input, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
