import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { IStaff } from "@/types/database";
import { PERMISSIONS } from "@/constants/permissions";
import { returnService } from "@/modules/returns";
import { ReviewReturnSchema } from "@/modules/returns/validators/return.validators";
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
 * POST /api/admin/returns/[id]/approve
 * Staff approves return request and assigns destination warehouse facility.
 * RBAC: Requires RETURNS_APPROVE or RETURNS_MANAGE.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.RETURNS_APPROVE,
      PERMISSIONS.RETURNS_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = ReviewReturnSchema.safeParse({ ...body, approved: true });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid approval payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await returnService.reviewReturn(id, parsed.data, staff as unknown as IStaff);

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
