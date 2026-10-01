"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag, User } from "lucide-react";
import { PRIMARY_NAVIGATION, PrimaryNavItem } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { MegaMenu } from "./mega-menu";
import { SearchOverlay } from "./search-overlay";
import { IconButton } from "@/components/ui/icon-button";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function StorefrontHeader() {
  const pathname = usePathname();
  const { count: wishlistCount } = useWishlist();
  const { itemCount: cartCount, openDrawer } = useCart();
  const [activeCategory, setActiveCategory] = React.useState<PrimaryNavItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close mega menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCategory) {
        setActiveCategory(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCategory]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-all">
        <div className="container mx-auto flex h-20 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            href={ROUTES.HOME}
            className="flex flex-col select-none group focus:outline-none focus:ring-1 focus:ring-primary rounded"
            aria-label="VÉRONA Home"
          >
            <span className="font-serif text-2xl sm:text-3xl font-normal tracking-[0.25em] uppercase text-foreground group-hover:opacity-90 transition-opacity">
              VÉRONA
            </span>
            <span className="text-[8px] font-mono tracking-[0.35em] text-muted-foreground uppercase -mt-1 hidden sm:block">
              Haute Couture
            </span>
          </Link>

          {/* Desktop Primary Category Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-7 h-full"
          >
            {PRIMARY_NAVIGATION.map((cat) => {
              const isActive = pathname === cat.href || (cat.href !== "/" && pathname.startsWith(cat.href));
              const isHighlight = cat.isHighlight;
              const isSale = cat.isSale;
              const isMenuOpen = activeCategory?.id === cat.id;

              return (
                <div
                  key={cat.id}
                  className="h-full flex items-center relative"
                  onMouseEnter={() => setActiveCategory(cat)}
                  onFocus={() => setActiveCategory(cat)}
                >
                  <Link
                    href={cat.href}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="true"
                    className={`h-full flex items-center text-xs font-medium uppercase tracking-[0.15em] transition-colors relative hover:text-foreground focus:outline-none focus:text-foreground ${
                      isSale
                        ? "text-red-600 font-bold dark:text-red-400"
                        : isHighlight
                        ? "text-foreground font-semibold"
                        : isActive
                        ? "text-foreground font-semibold"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {(isMenuOpen || isActive) && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white animate-fade-in" />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Actions Suite: Search, Wishlist, Bag, Account */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Search Trigger */}
            <button
              ref={searchButtonRef}
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-3 rounded-full border border-border bg-neutral-100/70 hover:bg-neutral-100 px-4 py-2 text-xs text-neutral-500 w-56 lg:w-64 transition-all focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
              aria-label="Open search dialog"
            >
              <Search className="h-3.5 w-3.5 text-neutral-400 select-none" />
              <span className="truncate">Search collections...</span>
            </button>

            {/* Mobile Search Icon Button */}
            <IconButton
              aria-label="Search collections"
              className="md:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </IconButton>

            {/* Wishlist Affordance */}
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

            {/* Shopping Bag Affordance */}
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

            {/* Notification Bell */}
            <NotificationBell className="hidden sm:inline-flex" />

            {/* Client Account Entry */}
            <Link href={ROUTES.ACCOUNT} aria-label="Client Account" className="hidden sm:inline-flex">
              <IconButton aria-label="Client Account">
                <User className="h-5 w-5" />
              </IconButton>
            </Link>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        {activeCategory && (
          <MegaMenu
            item={activeCategory}
            onClose={() => setActiveCategory(null)}
          />
        )}
      </header>

      {/* Global Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerRef={searchButtonRef}
      />
    </>
  );
}
