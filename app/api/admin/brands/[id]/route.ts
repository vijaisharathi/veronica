/**
 * VÉRONA — Admin Single Brand API Route (Phase 28)
 *
 * PATCH  /api/admin/brands/:id — Update brand details
 * DELETE /api/admin/brands/:id — Archive brand (safe check against active products)
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminBrandUpdateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.BRANDS_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminBrandUpdateSchema);
    const updated = await adminCatalogService.updateBrand(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.BRANDS_DELETE);
    const { id } = await params;

    const result = await adminCatalogService.archiveBrand(id, staff);
    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
