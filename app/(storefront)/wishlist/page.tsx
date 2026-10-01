import * as React from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Saved Selections (Wishlist)",
  description: "View your saved luxury garments and personal wishlist selections at VÉRONA.",
};

export default function WishlistPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: "Wishlist" }]} />
      <WishlistView />
    </div>
  );
}
