/**
 * VÉRONA — Admin Payment Detail API Route (Phase 27)
 *
 * GET /api/admin/payments/[id] — Retrieves complete payment transaction details with attempt history.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminPaymentService } from "@/modules/admin/services/admin-payment.service";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PAYMENTS_READ);
    const { id } = await params;

    const payment = await adminPaymentService.getPaymentDetail(id);

    return apiSuccess(payment, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
