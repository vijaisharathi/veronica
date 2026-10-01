/**
 * VÉRONA — Admin Categories API Route (Phase 28)
 *
 * GET  /api/admin/categories — List all categories with product counts.
 * POST /api/admin/categories — Create a new category.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCategoryCreateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.CATEGORIES_READ);

    const categories = await adminCatalogService.listCategories();

    return apiSuccess({ categories });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.CATEGORIES_CREATE);

    const body = await validateRequestBody(request, AdminCategoryCreateSchema);
    const created = await adminCatalogService.createCategory(body, staff);

    return apiSuccess(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
