import { cartService } from "@/modules/cart/cart.service";
import { getViewerIdentity } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/cart/count
 * Returns total garment quantity count in active cart.
 */
export async function GET() {
  try {
    const { identity } = await getViewerIdentity();
    const countData = await cartService.getCartCount(identity);

    return apiSuccess(countData, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
