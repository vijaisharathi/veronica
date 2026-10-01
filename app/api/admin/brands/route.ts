/**
 * VÉRONA — Admin Brands API Route (Phase 28)
 *
 * GET  /api/admin/brands — List all brands with product counts.
 * POST /api/admin/brands — Create a new brand.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminBrandCreateSchema } from "@/modules/catalog/admin-catalog.validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.BRANDS_READ);

    const brands = await adminCatalogService.listBrands();

    return apiSuccess({ brands });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.BRANDS_CREATE);

    const body = await validateRequestBody(request, AdminBrandCreateSchema);
    const created = await adminCatalogService.createBrand(body, staff);

    return apiSuccess(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
