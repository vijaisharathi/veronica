/**
 * VÉRONA — Admin Audit Log Record API
 *
 * GET /api/admin/audit-logs/:id — Single audit log event detail with before/after state.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminAuditService } from "@/modules/admin/services/admin-audit.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.AUDIT_READ);
    const { id } = await params;
    const result = await adminAuditService.getAuditLog(id);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
