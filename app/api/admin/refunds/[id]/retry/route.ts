import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { refundService } from "@/modules/refunds";
import { RetryRefundSchema } from "@/modules/refunds/validators/refund.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/refunds/[id]/retry
 * Retry a failed refund after verifying failure and remaining balance.
 * RBAC: Requires REFUNDS_RETRY or REFUNDS_MANAGE.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.REFUNDS_RETRY,
      PERMISSIONS.REFUNDS_MANAGE,
    ]);
    const staffId = staff._id.toString();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = RetryRefundSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid retry payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await refundService.retryRefund(id, staffId, parsed.data.reason);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
