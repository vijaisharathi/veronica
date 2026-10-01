import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { apiSuccess, apiError } from "@/lib/response";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

/**
 * DELETE /api/wishlist/:productId
 * Removes an item from the customer's wishlist (idempotent, ownership enforced)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const customer = await requireCustomer();
    const { productId } = await params;

    const removed = await wishlistService.removeFromWishlist(
      customer._id.toString(),
      productId
    );

    return apiSuccess({ removed, productId }, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}
