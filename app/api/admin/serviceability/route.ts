import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/serviceability
 * Lists configured delivery serviceability rules with pagination and search.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.SERVICEABILITY_READ);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await deliveryServiceabilityService.listRules({
      page,
      limit,
      status,
      search,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST /api/admin/serviceability
 * Creates a new delivery serviceability rule with audit trail.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.SERVICEABILITY_UPDATE);
    const body = await request.json().catch(() => ({}));
    const clientIp = getClientIp(request.headers);

    const result = await deliveryServiceabilityService.createRule(body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress: clientIp,
    });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
