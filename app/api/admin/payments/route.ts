/**
 * VÉRONA — Admin Payment Management API Route (Phase 27)
 *
 * GET /api/admin/payments — Retrieves paginated payment transactions with search and status filtering.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminPaymentService } from "@/modules/admin/services/admin-payment.service";
import { ListPaymentsQuerySchema } from "@/modules/admin/validators/admin.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.PAYMENTS_READ);

    const { searchParams } = new URL(request.url);
    const parsed = ListPaymentsQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const options = parsed.success ? parsed.data : {};
    const result = await adminPaymentService.listPayments(options);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
