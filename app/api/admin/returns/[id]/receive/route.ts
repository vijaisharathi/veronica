import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { returnService } from "@/modules/returns";
import { ReceiveReturnSchema } from "@/modules/returns/validators/return.validators";
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
 * POST /api/admin/returns/[id]/receive
 * Warehouse staff receives returned package at their facility.
 * Enforces warehouse scoping server-side.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.RETURNS_RECEIVE,
      PERMISSIONS.RETURNS_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = ReceiveReturnSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid receiving payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const updated = await returnService.receiveReturn(id, parsed.data, staff as unknown as IStaff);

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
