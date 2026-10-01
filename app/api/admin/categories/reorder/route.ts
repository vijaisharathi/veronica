/**
 * VÉRONA — Admin Category Reorder API Route (Phase 28)
 *
 * POST /api/admin/categories/reorder — Persist category display ordering
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCategoryReorderSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.CATEGORIES_UPDATE);

    const body = await validateRequestBody(request, AdminCategoryReorderSchema);
    const result = await adminCatalogService.reorderCategories(body.orderedIds, staff);

    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
