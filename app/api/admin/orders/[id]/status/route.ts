import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { orderService, AdminUpdateOrderStatusSchema } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/orders/[id]/status
 * Transitions order status through the centralized finite state machine.
 * RBAC: Requires ORDERS_UPDATE permission.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const staff = await requirePermission(PERMISSIONS.ORDERS_UPDATE);
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parseResult = AdminUpdateOrderStatusSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors[0]?.message || "Invalid status transition request payload",
        parseResult.error.flatten().fieldErrors
      );
    }

    const { status, reason } = parseResult.data;
    const staffIdentifier = staff.email || staff._id.toString();

    const updatedOrder = await orderService.updateOrderStatusAsAdmin(
      id,
      staffIdentifier,
      status,
      reason
    );

    return apiSuccess(updatedOrder, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
