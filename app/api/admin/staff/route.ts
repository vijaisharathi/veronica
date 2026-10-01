/**
 * VÉRONA — Admin Staff Management API
 *
 * GET  /api/admin/staff — Query workforce members with role, status, warehouse filters.
 * POST /api/admin/staff — Onboard / create staff member with role & scope assignments.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import {
  AdminStaffListQuerySchema,
  AdminStaffCreateSchema,
} from "@/modules/admin/validators/admin-staff.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.STAFF_READ,
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_UPDATE,
    ]);

    const { searchParams } = new URL(request.url);
    const parsedQuery = AdminStaffListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      status: searchParams.get("status") || undefined,
      warehouseId: searchParams.get("warehouseId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const result = await adminStaffService.listStaff(parsedQuery);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.STAFF_CREATE);
    const body = await request.json();
    const input = AdminStaffCreateSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminStaffService.createOrInviteStaff(input, actorStaff, { ip, ua });
    return apiSuccess(result, { status: 201 });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
