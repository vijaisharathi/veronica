/**
 * VÉRONA — Admin Customers API
 *
 * GET /api/admin/customers — List customers with search, status filtering, and server-side pagination.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminCustomerService } from "@/modules/admin/services/admin-customer.service";
import { AdminCustomerListQuerySchema } from "@/modules/admin/validators/admin-customer.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const parsedQuery = AdminCustomerListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      emailVerified: searchParams.get("emailVerified") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const result = await adminCustomerService.listCustomers(parsedQuery);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
