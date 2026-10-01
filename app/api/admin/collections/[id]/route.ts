/**
 * VÉRONA — Admin Single Collection API Route (Phase 28)
 *
 * PATCH  /api/admin/collections/:id — Update collection and product membership
 * DELETE /api/admin/collections/:id — Archive collection
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCollectionUpdateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.COLLECTIONS_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminCollectionUpdateSchema);
    const updated = await adminCatalogService.updateCollection(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.COLLECTIONS_DELETE);
    const { id } = await params;

    const result = await adminCatalogService.archiveCollection(id, staff);
    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
