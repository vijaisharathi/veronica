/**
 * VÉRONA — Admin Bulk Product Operations API Route (Phase 28)
 *
 * POST /api/admin/products/bulk — Execute bulk operations on products.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminBulkProductActionSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

    const body = await validateRequestBody(request, AdminBulkProductActionSchema);
    const result = await adminCatalogService.bulkUpdateProducts(body, staff);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
