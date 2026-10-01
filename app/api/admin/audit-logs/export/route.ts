/**
 * VÉRONA — Admin Audit Logs Export API
 *
 * GET /api/admin/audit-logs/export — Audited export of system audit records.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminAuditService } from "@/modules/admin/services/admin-audit.service";
import { AdminAuditExportQuerySchema } from "@/modules/admin/validators/admin-audit.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.AUDIT_EXPORT);

    const { searchParams } = new URL(request.url);
    const parsedQuery = AdminAuditExportQuerySchema.parse({
      format: searchParams.get("format") || "json",
      entityType: searchParams.get("entityType") || undefined,
      action: searchParams.get("action") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminAuditService.exportAuditLogs(parsedQuery, actorStaff, { ip, ua });
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
