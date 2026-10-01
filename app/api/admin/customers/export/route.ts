/**
 * VÉRONA — Admin Customers Export API
 *
 * GET /api/admin/customers/export — Export sanitized customer data with audit record.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminCustomerService } from "@/modules/admin/services/admin-customer.service";
import { AdminCustomerExportQuerySchema } from "@/modules/admin/validators/admin-customer.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);

    const { searchParams } = new URL(request.url);
    const parsedQuery = AdminCustomerExportQuerySchema.parse({
      format: searchParams.get("format") || "json",
      status: searchParams.get("status") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminCustomerService.exportCustomers(parsedQuery, staff, { ip, ua });
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
