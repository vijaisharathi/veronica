/**
 * VÉRONA — Admin Product Publish API Route (Phase 28)
 *
 * POST /api/admin/products/[id]/publish — Validates and publishes product.
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
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_PUBLISH);
    const { id } = await context.params;

    const published = await adminCatalogService.publishProduct(id, staff);

    return apiSuccess(published);
  } catch (error) {
    return apiError(error);
  }
}
