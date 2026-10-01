import { NextRequest } from "next/server";
import { getViewerIdentity, SESSION_COOKIE_NAME } from "@/lib/session";
import { recentlyViewedService } from "@/modules/wishlist/recently-viewed.service";
import { RecordRecentlyViewedSchema } from "@/modules/wishlist/wishlist.types";
import { apiSuccess, apiError } from "@/lib/response";
import { validateData } from "@/lib/validation";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

/**
 * GET /api/recently-viewed?exclude=[productId]&limit=[number]
 * Retrieves recent products for current authenticated customer or guest session.
 */
export async function GET(req: NextRequest) {
  try {
    const { identity, newSessionId } = await getViewerIdentity();
    const { searchParams } = new URL(req.url);

    const excludeProductId = searchParams.get("exclude") || undefined;
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const items = await recentlyViewedService.getRecentlyViewed(identity, {
      excludeProductId,
      limit: isNaN(limit) ? 12 : limit,
    });

    const response = apiSuccess(
      { items, count: items.length },
      { headers: CACHE_HEADERS }
    );

    if (newSessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return response;
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/recently-viewed
 * Records a viewed product for the current viewer identity.
 */
export async function POST(req: NextRequest) {
  try {
    const { identity, newSessionId } = await getViewerIdentity();
    const body = await req.json();
    const input = validateData(RecordRecentlyViewedSchema, body);

    const recorded = await recentlyViewedService.recordView(identity, input.productId);

    const response = apiSuccess(
      { recorded, productId: input.productId },
      { status: 200, headers: CACHE_HEADERS }
    );

    if (newSessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return response;
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/recently-viewed
 * Clears all recently viewed history for the current viewer identity.
 */
export async function DELETE() {
  try {
    const { identity } = await getViewerIdentity();
    const cleared = await recentlyViewedService.clearRecentlyViewed(identity);
    return apiSuccess({ cleared }, { headers: CACHE_HEADERS });
  } catch (err) {
    return apiError(err);
  }
}
