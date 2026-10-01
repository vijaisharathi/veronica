/**
 * VÉRONA — Admin Customer Detail API
 *
 * GET /api/admin/customers/:id — Comprehensive customer profile & operational context.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminCustomerService } from "@/modules/admin/services/admin-customer.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_MANAGE,
    ]);

    const { id } = await params;
    const result = await adminCustomerService.getCustomerDetail(id, staff);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
