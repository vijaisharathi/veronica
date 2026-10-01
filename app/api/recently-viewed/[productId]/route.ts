import { NextRequest } from "next/server";
import { getViewerIdentity } from "@/lib/session";
import { recentlyViewedService } from "@/modules/wishlist/recently-viewed.service";
import { apiSuccess, apiError } from "@/lib/response";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

/**
 * DELETE /api/recently-viewed/:productId
 * Removes a specific product from recently viewed history.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { identity } = await getViewerIdentity();
    const { productId } = await params;

    const removed = await recentlyViewedService.removeItem(identity, productId);

    return apiSuccess({ removed, productId }, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}
