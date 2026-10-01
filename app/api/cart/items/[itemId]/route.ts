import { NextRequest } from "next/server";
import { cartService } from "@/modules/cart/cart.service";
import { UpdateQuantityInputSchema, CartItemParamSchema } from "@/modules/cart/cart.validation";
import { getViewerIdentity } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/response";
import { validateRequestBody, validateData } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

/**
 * PATCH /api/cart/items/:itemId
 * Updates the quantity of a specific cart item.
 * If quantity is 0, the item is removed. Enforces ownership server-side.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const rawParams = await params;
    const { itemId } = validateData(CartItemParamSchema, rawParams);
    const body = await validateRequestBody(request, UpdateQuantityInputSchema);

    const { identity } = await getViewerIdentity();
    const cart = await cartService.updateItemQuantity(identity, itemId, body.quantity);

    return apiSuccess(cart, { headers: CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * DELETE /api/cart/items/:itemId
 * Removes a specific item from the shopping bag.
 * Enforces ownership server-side.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const rawParams = await params;
    const { itemId } = validateData(CartItemParamSchema, rawParams);

    const { identity } = await getViewerIdentity();
    const cart = await cartService.removeItem(identity, itemId);

    return apiSuccess(cart, { headers: CACHE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
