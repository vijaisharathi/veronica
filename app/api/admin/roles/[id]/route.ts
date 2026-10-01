/**
 * VÉRONA — Admin Role Detail & Permissions Mutation API
 *
 * GET   /api/admin/roles/:id — Get role details and permission mappings.
 * PATCH /api/admin/roles/:id — Update permissions assigned to a role.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminRolePermissionService } from "@/modules/admin/services/admin-role-permission.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

const RoleUpdatePermissionsSchema = z.object({
  permissions: z.array(z.string().trim()).min(1, "At least one permission must be assigned"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyPermission([
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_MANAGE,
    ]);

    const { id } = await params;
    const result = await adminRolePermissionService.getRole(id);
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
    const actorStaff = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const { id } = await params;
    const body = await request.json();
    const { permissions } = RoleUpdatePermissionsSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminRolePermissionService.updateRolePermissions(id, permissions, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
