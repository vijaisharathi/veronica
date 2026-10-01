/**
 * VÉRONA — Admin Product Preview API Route (Phase 28)
 *
 * GET /api/admin/products/[id]/preview — Secure preview of draft/archived products.
 * Guarantees noindex and no-cache headers.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";

export const dynamic = "force-dynamic";

const PREVIEW_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
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

    return apiSuccess(product, { headers: PREVIEW_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
