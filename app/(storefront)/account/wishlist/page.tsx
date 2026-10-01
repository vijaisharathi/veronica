import * as React from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  title: "Client Wardrobe (Wishlist) — VÉRONA Account",
  description: "Manage your curated luxury selections and personal wardrobe reservations.",
};

export default function AccountWishlistPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Account", href: ROUTES.ACCOUNT },
          { label: "Saved Selections" },
        ]}
      />
      <WishlistView />
    </div>
  );
}
