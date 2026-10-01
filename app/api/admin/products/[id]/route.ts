/**
 * VÉRONA — Admin Product Item API Route (Phase 28)
 *
 * GET    /api/admin/products/[id] — Fetch product detail with variants and relationships.
 * PATCH  /api/admin/products/[id] — Update product fields.
 * DELETE /api/admin/products/[id] — Archive product.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { UpdateProductInputSchema } from "@/modules/catalog/catalog.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ);

    const { id } = await context.params;
    const product = await adminCatalogService.getProductDetail(id);

    return apiSuccess(product, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

    const { id } = await context.params;
    const body = await validateRequestBody(request, UpdateProductInputSchema);
    const updatedProduct = await adminCatalogService.updateProduct(id, body, staff);

    return apiSuccess(updatedProduct, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_DELETE);

    const { id } = await context.params;
    const success = await adminCatalogService.archiveProduct(id, staff);

    return apiSuccess({ archived: success }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
