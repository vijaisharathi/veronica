/**
 * VÉRONA — Admin Single Category API Route (Phase 28)
 *
 * PATCH  /api/admin/categories/:id — Update category (with cycle & self-parenting prevention)
 * DELETE /api/admin/categories/:id — Archive category (checks active products count)
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCategoryUpdateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CATEGORIES_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminCategoryUpdateSchema);
    const updated = await adminCatalogService.updateCategory(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CATEGORIES_DELETE);
    const { id } = await params;

    const result = await adminCatalogService.archiveCategory(id, staff);
    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
