/**
 * VÉRONA — Admin Product Variants API Route
 *
 * POST /api/admin/products/[id]/variants — Create a new variant for a product.
 * Guarded by Phase 5 RBAC: requires staff with PRODUCTS_CREATE permission.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { validateRequestBody } from "@/lib/validation";
import { CreateVariantInputSchema } from "@/modules/catalog/catalog.validation";

export const dynamic = "force-dynamic";

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
    const result = await productService.getAdminVariantsForProduct(id);

    return apiSuccess({
      productId: result.product._id.toString(),
      productName: result.product.name,
      variants: result.variants,
      matrix: result.matrix,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

    const { id } = await context.params;
    const body = await validateRequestBody(request, CreateVariantInputSchema);
    const createdVariant = await productService.createVariant(id, body);

    return apiSuccess(createdVariant, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

