import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { cartService } from "@/modules/cart/cart.service";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { ROUTES } from "@/config/routes";
import { sanitizeReturnUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Checkout & Order Review | VÉRONA",
  description: "Authoritative order review, address selection, delivery serviceability, and price verification for VÉRONA atelier garments.",
};

export const dynamic = "force-dynamic";

/**
 * /checkout
 * Production-ready Checkout & Order Review Route.
 *
 * Enforces strict entry requirements:
 * 1. Customer Authentication: Redirects unauthenticated visitors to login with a safe returnUrl.
 * 2. Active Bag Check: Redirects empty cart states back to /cart.
 * 3. Authoritative Orchestration: Coordinates server-side validation and pricing integrity.
 */
export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    const safeReturn = sanitizeReturnUrl(ROUTES.CHECKOUT, ROUTES.HOME);
    redirect(`${ROUTES.LOGIN}?returnUrl=${encodeURIComponent(safeReturn)}`);
  }

  const cart = await cartService.getCart({ customerId: customer._id.toString() });
  if (!cart || cart.items.length === 0) {
    redirect(ROUTES.CART);
  }

  return <CheckoutView />;
}
