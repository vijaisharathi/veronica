/**
 * VÉRONA — Admin Collections API Route (Phase 28)
 *
 * GET  /api/admin/collections — List all collections with product counts.
 * POST /api/admin/collections — Create a new collection.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCollectionCreateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.COLLECTIONS_READ);

    const collections = await adminCatalogService.listCollections();

    return apiSuccess({ collections });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.COLLECTIONS_CREATE);

    const body = await validateRequestBody(request, AdminCollectionCreateSchema);
    const created = await adminCatalogService.createCollection(body, staff);

    return apiSuccess(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
