/**
 * VÉRONA — Admin Customer Suspension API
 *
 * POST /api/admin/customers/:id/suspend — Suspend customer account with audit trail.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { CustomerStatus } from "@/constants/status";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminCustomerService } from "@/modules/admin/services/admin-customer.service";
import { AdminCustomerStatusUpdateSchema } from "@/modules/admin/validators/admin-customer.validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requirePermission(PERMISSIONS.CUSTOMERS_SUSPEND);
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }

    const parsed = AdminCustomerStatusUpdateSchema.parse({
      status: CustomerStatus.SUSPENDED,
      ...(typeof body === "object" && body !== null ? body : {}),
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminCustomerService.updateCustomerStatus(id, parsed, staff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
