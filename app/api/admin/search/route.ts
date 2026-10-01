/**
 * VÉRONA — Admin Global Search API Route (Phase 27)
 *
 * GET /api/admin/search?q=... — Permission-filtered federated search across
 * orders, products, customers, payments, refunds, returns, reviews, and support tickets.
 */

import { NextRequest } from "next/server";
import { requireStaff, getEffectivePermissions } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { adminSearchService } from "@/modules/admin/services/admin-search.service";
import { AdminSearchQuerySchema } from "@/modules/admin/validators/admin.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    const permissions = await getEffectivePermissions(staff);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const validation = AdminSearchQuerySchema.safeParse({ q });
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0]?.message || "Invalid search query");
    }

    const assignedWarehouseId = staff.assignedWarehouseId?.toString();
    const results = await adminSearchService.search(validation.data.q, permissions, assignedWarehouseId);

    return apiSuccess({ results, query: validation.data.q }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
