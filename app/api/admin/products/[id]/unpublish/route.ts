/**
 * VÉRONA — Admin Product Unpublish API Route (Phase 28)
 *
 * POST /api/admin/products/[id]/unpublish — Moves product back to DRAFT.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);
    const { id } = await context.params;

    const unpublished = await adminCatalogService.unpublishProduct(id, staff);

    return apiSuccess(unpublished);
  } catch (error) {
    return apiError(error);
  }
}
