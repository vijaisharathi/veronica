import { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/session";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { apiSuccess, apiError } from "@/lib/response";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

/**
 * GET /api/wishlist/status?productIds=id1,id2...
 * Returns a batch map of product IDs to boolean wishlisted statuses.
 * If user is unauthenticated, returns false for all requested IDs without error.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdsParam = searchParams.get("productIds");

    if (!productIdsParam) {
      return apiSuccess({}, { headers: CACHE_HEADERS });
    }

    const productIds = productIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const customer = await getCurrentCustomer();
    if (!customer) {
      // Unauthenticated visitor: all false
      const statusMap: Record<string, boolean> = {};
      for (const pid of productIds) {
        statusMap[pid] = false;
      }
      return apiSuccess(statusMap, { headers: CACHE_HEADERS });
    }

    const statusMap = await wishlistService.getWishlistStatusForProducts(
      customer._id.toString(),
      productIds
    );

    return apiSuccess(statusMap, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}
