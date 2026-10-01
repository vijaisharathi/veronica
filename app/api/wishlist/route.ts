import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { AddToWishlistSchema } from "@/modules/wishlist/wishlist.types";
import { apiSuccess, apiError } from "@/lib/response";
import { validateData } from "@/lib/validation";

// Private personalized response - never cache on shared caches / CDNs
const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

/**
 * GET /api/wishlist
 * Returns current customer's wishlist items with hydrated product previews
 */
export async function GET() {
  try {
    const customer = await requireCustomer();
    const result = await wishlistService.getWishlist(customer._id.toString());
    return apiSuccess(result, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/wishlist
 * Adds an item to the authenticated customer's wishlist (idempotent)
 */
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer();
    const body = await req.json();
    const input = validateData(AddToWishlistSchema, body);

    const item = await wishlistService.addToWishlist(
      customer._id.toString(),
      input.productId,
      input.variantId
    );

    return apiSuccess(item, { status: 201, headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/wishlist
 * Clears all items in the customer's wishlist
 */
export async function DELETE() {
  try {
    const customer = await requireCustomer();
    const cleared = await wishlistService.clearWishlist(customer._id.toString());
    return apiSuccess({ cleared }, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}
