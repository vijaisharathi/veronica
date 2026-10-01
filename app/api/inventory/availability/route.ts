/**
 * VÉRONA — Batch Variant Availability API
 *
 * GET /api/inventory/availability?variantIds=v1,v2,v3
 * Safe batch query for storefront and cart item validation.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantIdsParam = searchParams.get("variantIds");

    if (!variantIdsParam) {
      return apiSuccess({ availability: {} });
    }

    const variantIds = variantIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const availability = await inventoryService.getBatchVariantAvailability(variantIds);

    return apiSuccess({ availability });
  } catch (error) {
    return apiError(error);
  }
}
