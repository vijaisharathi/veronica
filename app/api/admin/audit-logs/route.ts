/**
 * VÉRONA — Admin Audit Logs Query API
 *
 * GET /api/admin/audit-logs — Query append-only audit trail with server-side pagination & filters.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AuditActorType } from "@/constants/status";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminAuditService } from "@/modules/admin/services/admin-audit.service";
import { AdminAuditListQuerySchema } from "@/modules/admin/validators/admin-audit.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.AUDIT_READ);

    const { searchParams } = new URL(request.url);
    const actorTypeParam = searchParams.get("actorType");
    const actorType = actorTypeParam && Object.values(AuditActorType).includes(actorTypeParam as AuditActorType)
      ? (actorTypeParam as AuditActorType)
      : undefined;

    const parsedQuery = AdminAuditListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      actorId: searchParams.get("actorId") || undefined,
      actorType,
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 25,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const result = await adminAuditService.listAuditLogs(parsedQuery);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
