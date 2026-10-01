import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { inspectionService } from "@/modules/returns";
import { CompleteInspectionSchema } from "@/modules/returns/validators/return.validators";
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
 * POST /api/admin/returns/[id]/complete-inspection
 * Completes QC inspection, evaluates condition, and applies disposition / restock.
 * RBAC: Requires RETURNS_INSPECT or RETURNS_MANAGE.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.RETURNS_INSPECT,
      PERMISSIONS.RETURNS_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = CompleteInspectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid inspection completion payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await inspectionService.completeInspection(id, parsed.data, staff as unknown as IStaff);

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
