/**
 * VÉRONA — Admin Products API Route (Phase 28)
 *
 * GET  /api/admin/products — List products with search, filtering, and pagination.
 * POST /api/admin/products — Create a new product.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { AdminProductListQuerySchema } from "@/modules/catalog/admin-catalog.validation";
import { validateRequestBody } from "@/lib/validation";
import { CreateProductInputSchema } from "@/modules/catalog/catalog.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ);

    const { searchParams } = new URL(request.url);
    const queryParams = AdminProductListQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const result = await adminCatalogService.listProducts(queryParams);

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

    const body = await validateRequestBody(request, CreateProductInputSchema);
    const createdProduct = await adminCatalogService.createProduct(body, staff);

    return apiSuccess(createdProduct, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
