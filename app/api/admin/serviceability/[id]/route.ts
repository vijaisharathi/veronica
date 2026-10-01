import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/serviceability/[id]
 * Retrieves details for a specific serviceability rule.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.SERVICEABILITY_READ);
    const { id } = await context.params;
    const result = await deliveryServiceabilityService.getRuleById(id);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * PATCH /api/admin/serviceability/[id]
 * Updates an existing serviceability rule with audit trail.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const staff = await requirePermission(PERMISSIONS.SERVICEABILITY_UPDATE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const clientIp = getClientIp(request.headers);

    const result = await deliveryServiceabilityService.updateRule(id, body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress: clientIp,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * DELETE /api/admin/serviceability/[id]
 * Deletes an existing serviceability rule with audit trail.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const staff = await requirePermission(PERMISSIONS.SERVICEABILITY_UPDATE);
    const { id } = await context.params;
    const clientIp = getClientIp(request.headers);

    const result = await deliveryServiceabilityService.deleteRule(id, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress: clientIp,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
