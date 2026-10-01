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
 * POST /api/admin/refunds/[id]/reconcile
 * Authoritatively queries the payment gateway to reconcile unknown or conflicting states.
 * RBAC: Requires REFUNDS_RECONCILE or REFUNDS_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.REFUNDS_RECONCILE,
      PERMISSIONS.REFUNDS_MANAGE,
    ]);
    const staffId = staff._id.toString();
    const { id } = await params;

    const result = await refundService.reconcileRefund(id, staffId);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
