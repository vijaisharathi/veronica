import * as React from "react";
import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Shopping Bag",
  description: "Review garments in your VÉRONA shopping bag and proceed to checkout.",
};

export default function CartPage() {
  return <CartView />;
}
