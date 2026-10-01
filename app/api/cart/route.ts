import { cartService } from "@/modules/cart/cart.service";
import { getViewerIdentity, SESSION_COOKIE_NAME } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/cart
 * Returns the current customer or guest cart with hydrated items and subtotal.
 * Automatically performs guest-to-customer cart merge if customer is logged in.
 */
export async function GET() {
  try {
    const { identity, newSessionId, guestSessionId } = await getViewerIdentity();

    // Automatic guest cart merge upon customer authentication
    if (identity.customerId && guestSessionId) {
      await cartService.mergeGuestCart(identity.customerId, guestSessionId);
    }

    const cart = await cartService.getCart(identity);

    const response = apiSuccess(cart, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });

    if (newSessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 90 * 24 * 60 * 60, // 90 days
        path: "/",
      });
    }

    // If guest cart was merged into authenticated customer, clean up guest cookie
    if (identity.customerId && guestSessionId) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    return apiError(error);
  }
}

/**
 * DELETE /api/cart
 * Clears all items from the current user's or guest's cart.
 */
export async function DELETE() {
  try {
    const { identity } = await getViewerIdentity();
    const cart = await cartService.clearCart(identity);

    return apiSuccess(cart, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
