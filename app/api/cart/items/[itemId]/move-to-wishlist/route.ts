import { NextRequest } from "next/server";
import { cartService } from "@/modules/cart/cart.service";
import { CartItemParamSchema } from "@/modules/cart/cart.validation";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { validateData } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

/**
 * POST /api/cart/items/:itemId/move-to-wishlist
 * Moves an item from the shopping bag to the customer's personal wishlist.
 * Requires authenticated customer account.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const customer = await requireCustomer();
    const rawParams = await params;
    const { itemId } = validateData(CartItemParamSchema, rawParams);

    const cart = await cartService.moveToWishlist(customer._id.toString(), itemId);

    return apiSuccess(cart, {
      meta: { message: "Garment moved to your wishlist" },
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    return apiError(error);
  }
}
