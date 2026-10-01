/**
 * VÉRONA — Admin Permissions Catalog API
 *
 * GET /api/admin/permissions — List all available system permissions categorized by module.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminRolePermissionService } from "@/modules/admin/services/admin-role-permission.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(_request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.STAFF_PERMISSIONS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_MANAGE,
    ]);

    const result = await adminRolePermissionService.listPermissions();
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
