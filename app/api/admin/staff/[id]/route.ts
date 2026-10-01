/**
 * VÉRONA — Admin Staff Detail & Profile Update API
 *
 * GET   /api/admin/staff/:id — Detailed staff record with effective permissions & audit log.
 * PATCH /api/admin/staff/:id — Update basic profile information.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import { AdminStaffUpdateSchema } from "@/modules/admin/validators/admin-staff.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.STAFF_READ);
    const { id } = await params;
    const result = await adminStaffService.getStaffDetail(id);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.STAFF_UPDATE);
    const { id } = await params;
    const body = await request.json();
    const input = AdminStaffUpdateSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminStaffService.updateStaff(id, input, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
