/**
 * VÉRONA — Admin Variant Item API Route
 *
 * PATCH /api/admin/variants/[id] — Update variant.
 * DELETE /api/admin/variants/[id] — Discontinue / archive variant.
 * Guarded by Phase 5 RBAC: requires staff with PRODUCTS_UPDATE / PRODUCTS_DELETE.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { validateRequestBody } from "@/lib/validation";
import { UpdateVariantInputSchema } from "@/modules/catalog/catalog.validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

    const { id } = await context.params;
    const body = await validateRequestBody(request, UpdateVariantInputSchema);
    const updatedVariant = await productService.updateVariant(id, body);

    return apiSuccess(updatedVariant);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_DELETE);

    const { id } = await context.params;
    const success = await productService.archiveVariant(id);

    return apiSuccess({ archived: success });
  } catch (error) {
    return apiError(error);
  }
}
