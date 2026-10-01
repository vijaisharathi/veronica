import { NextResponse } from "next/server";
import { requireStaff, getEffectivePermissions } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 * Returns current staff member details and resolved effective permissions.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const staff = await requireStaff();
    const permissions = await getEffectivePermissions(staff);

    const staffDto = {
      id: staff._id.toString(),
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      status: staff.status,
      roles: staff.roles,
      permissions,
    };

    return apiSuccess(staffDto, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
