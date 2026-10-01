import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { refundService } from "@/modules/refunds";
import {
  AdminRefundQuerySchema,
  CreateManualRefundSchema,
} from "@/modules/refunds/validators/refund.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/refunds
 * List all refunds with server-side pagination, status counts, and multi-field search.
 * RBAC: Requires REFUNDS_READ, REFUNDS_MANAGE, or REFUNDS_PROCESS.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REFUNDS_READ,
      PERMISSIONS.REFUNDS_MANAGE,
      PERMISSIONS.REFUNDS_PROCESS,
    ]);

    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    const parsed = AdminRefundQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid query parameters",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await refundService.getAdminRefunds(parsed.data);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/admin/refunds
 * Manually initiate a refund with strict server-side validation and audit logging.
 * RBAC: Requires REFUNDS_REQUEST, REFUNDS_INITIATE, or REFUNDS_MANAGE.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.REFUNDS_REQUEST,
      PERMISSIONS.REFUNDS_INITIATE,
      PERMISSIONS.REFUNDS_MANAGE,
    ]);
    const staffId = staff._id.toString();

    const body = await request.json().catch(() => ({}));
    const parsed = CreateManualRefundSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid refund payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const refund = await refundService.createManualRefund(parsed.data, staffId);

    return apiSuccess(refund, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
