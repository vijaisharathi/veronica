import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { orderService } from "@/modules/orders";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/admin/orders/reconciliation
 * Scans for captured payments without orders and payment/order amount discrepancies.
 * RBAC: Requires ORDERS_READ permission.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ);

    const mismatches = await orderService.runReconciliationScan();

    return apiSuccess(
      {
        scannedAt: new Date().toISOString(),
        discrepanciesCount: mismatches.length,
        discrepancies: mismatches,
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
