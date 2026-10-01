import * as React from "react";
import { AnnouncementBar } from "@/components/navigation/announcement-bar";
import { StorefrontHeader } from "@/components/navigation/storefront-header";
import { MobileHeader } from "@/components/navigation/mobile-header";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { WishlistProvider } from "@/context/wishlist-context";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={null}>
      <WishlistProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* Top Promotional Announcement */}
            <AnnouncementBar />

            {/* Desktop Header */}
            <div className="hidden lg:block">
              <StorefrontHeader />
            </div>

            {/* Mobile Header */}
            <div className="block lg:hidden">
              <MobileHeader />
            </div>

            {/* Main Storefront Body Content */}
            <main className="flex-1 pb-16 lg:pb-0">{children}</main>

            {/* Footer */}
            <StorefrontFooter />

            {/* Mobile Fixed Bottom Navigation */}
            <MobileBottomNav />

            {/* Cart Drawer */}
            <CartDrawer />
          </div>
        </CartProvider>
      </WishlistProvider>
    </React.Suspense>
  );
}
