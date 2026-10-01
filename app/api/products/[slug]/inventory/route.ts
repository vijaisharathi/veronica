/**
 * VÉRONA — Customer Product Inventory Availability API
 *
 * GET /api/products/[slug]/inventory
 * Returns authoritative, customer-safe variant availability and Color x Size stock matrix.
 * Never exposes raw quantities or warehouse locations.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { productService } from "@/modules/catalog/product.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { ProductModel } from "@/db/models";
import { NotFoundError } from "@/lib/errors";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    // Resolve product by slug or ObjectId
    let productId: string | undefined;
    if (Types.ObjectId.isValid(slug)) {
      const prod = await ProductModel.findById(slug).lean();
      if (prod) {
        productId = prod._id.toString();
      }
    }

    if (!productId) {
      const result = await productService.getProductBySlug(slug);
      if (!result || !result.product) {
        throw new NotFoundError("Product", slug);
      }
      productId = result.product.id;
    }

    const matrix = await inventoryService.getProductAvailabilityMatrix(productId);

    return apiSuccess({
      productId,
      matrix: matrix.matrix,
      variants: matrix.variants,
    });
  } catch (error) {
    return apiError(error);
  }
}
