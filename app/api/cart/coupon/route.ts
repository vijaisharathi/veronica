import { NextRequest } from "next/server";
import { cartService } from "@/modules/cart/cart.service";
import { getViewerIdentity, SESSION_COOKIE_NAME } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/response";
import { ApplyCouponInputSchema } from "@/modules/pricing/pricing.validation";
import { validateData } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/cart/coupon
 * Applies a coupon code to the active cart.
 * Authoritatively validates coupon eligibility, min cart value, usage limits, and calculates pricing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateData(ApplyCouponInputSchema, body);
    const { identity, newSessionId } = await getViewerIdentity();

    const cart = await cartService.applyCoupon(identity, validated.code);

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
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return apiError(error);
  }
}

/**
 * DELETE /api/cart/coupon
 * Removes the currently applied coupon from the active cart and recalculates pricing.
 */
export async function DELETE() {
  try {
    const { identity, newSessionId } = await getViewerIdentity();
    const cart = await cartService.removeCoupon(identity);

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
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return apiError(error);
  }
}
