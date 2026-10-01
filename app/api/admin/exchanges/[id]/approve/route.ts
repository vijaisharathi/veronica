import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { exchangeService } from "@/modules/returns";
import { ReviewExchangeSchema } from "@/modules/returns/validators/return.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";

import { IStaff } from "@/types/database";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/exchanges/[id]/approve
 * Staff approves exchange request and triggers atomic inventory reservation.
 * RBAC: Requires EXCHANGES_APPROVE or EXCHANGES_MANAGE.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.EXCHANGES_APPROVE,
      PERMISSIONS.EXCHANGES_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = ReviewExchangeSchema.safeParse({ ...body, approved: true });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid approval payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await exchangeService.approveExchange(id, { notes: parsed.data.notes }, staff as unknown as IStaff);

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
