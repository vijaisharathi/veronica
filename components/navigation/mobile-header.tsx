"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Heart, ShoppingBag, Search } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { MobileDrawer } from "./mobile-drawer";
import { SearchOverlay } from "./search-overlay";
import { IconButton } from "@/components/ui/icon-button";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";

export function MobileHeader() {
  const { count: wishlistCount } = useWishlist();
  const { itemCount: cartCount, openDrawer } = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const searchButtonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/80">
      {/* Top Bar: Hamburger, Centered Logo, Wishlist, Bag */}
      <div className="flex h-14 items-center justify-between px-4">
        <IconButton
          ref={menuButtonRef}
          aria-label="Open Navigation Menu"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        <Link
          href={ROUTES.HOME}
          className="font-serif text-xl tracking-[0.25em] uppercase text-foreground select-none"
          aria-label="VÉRONA Home"
        >
          VÉRONA
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href={ROUTES.WISHLIST}
            aria-label={`Saved Items (${wishlistCount} items in wishlist)`}
            className="relative inline-flex"
          >
            <IconButton aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </IconButton>
          </Link>
          <div className="relative inline-flex">
            <IconButton
              aria-label={`Shopping Bag (${cartCount} ${cartCount === 1 ? "item" : "items"} in bag)`}
              onClick={openDrawer}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm font-mono">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </IconButton>
          </div>
        </div>
      </div>

      {/* Search Input Trigger Row */}
      <div className="px-4 pb-3">
        <button
          ref={searchButtonRef}
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-full border border-border bg-neutral-100/70 px-4 py-2 text-xs text-neutral-400 dark:bg-neutral-800 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Search garments and collections"
        >
          <Search className="h-3.5 w-3.5 text-neutral-400 select-none" />
          <span className="truncate">Search blazers, kurtas, dresses...</span>
        </button>
      </div>

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        triggerRef={menuButtonRef}
      />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerRef={searchButtonRef}
      />
    </div>
  );
}
