/**
 * VÉRONA — Admin Customer Addresses Scoped API
 *
 * GET /api/admin/customers/:id/addresses — Operationally retrieve customer addresses scoped strictly to customerId.
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
    await requireAnyPermission([
      PERMISSIONS.CUSTOMERS_ADDRESSES_READ,
      PERMISSIONS.CUSTOMERS_READ,
    ]);

    const { id } = await params;
    const result = await adminCustomerService.getCustomerAddresses(id);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
