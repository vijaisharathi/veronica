import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { refundService } from "@/modules/refunds";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/refunds/[id]
 * Fetch authoritative administrative refund details including calculation snapshots,
 * attempt records, and payment provider references.
 * RBAC: Requires REFUNDS_READ, REFUNDS_MANAGE, or REFUNDS_PROCESS.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REFUNDS_READ,
      PERMISSIONS.REFUNDS_MANAGE,
      PERMISSIONS.REFUNDS_PROCESS,
    ]);

    const { id } = await params;
    const result = await refundService.getAdminRefundDetail(id);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
