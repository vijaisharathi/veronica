/**
 * VÉRONA — Admin Staff Suspension API
 *
 * POST /api/admin/staff/:id/suspend — Suspend staff account with Last Super Admin protection.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { StaffStatus } from "@/constants/status";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import { AdminStaffStatusUpdateSchema } from "@/modules/admin/validators/admin-staff.validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.STAFF_SUSPEND);
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }

    const parsed = AdminStaffStatusUpdateSchema.parse({
      status: StaffStatus.SUSPENDED,
      ...(typeof body === "object" && body !== null ? body : {}),
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminStaffService.updateStaffStatus(id, parsed, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
