import { NextRequest } from "next/server";
import { cartService } from "@/modules/cart/cart.service";
import { AddToCartInputSchema } from "@/modules/cart/cart.validation";
import { getViewerIdentity, SESSION_COOKIE_NAME } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/response";
import { validateRequestBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/cart/items
 * Adds a garment variant to the shopping bag.
 * Performs server-side variant resolution, stock checks, and duplicate line merging.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateRequestBody(request, AddToCartInputSchema);
    const { identity, newSessionId, guestSessionId } = await getViewerIdentity();

    // Automatic guest cart merge if customer is logged in
    if (identity.customerId && guestSessionId) {
      await cartService.mergeGuestCart(identity.customerId, guestSessionId);
    }

    const cart = await cartService.addItem(identity, body);

    const response = apiSuccess(cart, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });

    if (newSessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      });
    }

    if (identity.customerId && guestSessionId) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    return apiError(error);
  }
}
