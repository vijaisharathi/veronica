"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LayoutGrid, Heart, User } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { SearchOverlay } from "./search-overlay";
import { MobileDrawer } from "./mobile-drawer";
import { useWishlist } from "@/hooks/use-wishlist";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count: wishlistCount } = useWishlist();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const searchBtnRef = React.useRef<HTMLButtonElement>(null);
  const categoriesBtnRef = React.useRef<HTMLButtonElement>(null);

  const navItems = [
    {
      label: "Home",
      icon: Home,
      href: ROUTES.HOME,
      isActive: pathname === ROUTES.HOME,
    },
    {
      label: "Shop",
      icon: LayoutGrid,
      href: ROUTES.SHOP,
      isActive: pathname === ROUTES.SHOP,
    },
    {
      label: "Search",
      icon: Search,
      onClick: () => setIsSearchOpen(true),
      isActive: isSearchOpen,
      ref: searchBtnRef,
    },
    {
      label: "Wishlist",
      icon: Heart,
      href: ROUTES.WISHLIST,
      isActive: pathname === ROUTES.WISHLIST,
    },
    {
      label: "Account",
      icon: User,
      href: ROUTES.ACCOUNT,
      isActive: pathname.startsWith(ROUTES.ACCOUNT),
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 py-1 shadow-floating pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <span className="flex flex-col items-center justify-center gap-1 py-1 px-3 relative">
                <span className="relative">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      item.isActive
                        ? "text-neutral-950 dark:text-white stroke-[2.2]"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                    aria-hidden="true"
                  />
                  {item.label === "Wishlist" && wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground shadow-sm">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium tracking-tight ${
                    item.isActive
                      ? "text-neutral-950 dark:text-white font-semibold"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {item.label}
                </span>
              </span>
            );

            if (item.href) {
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="select-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={index}
                ref={item.ref}
                type="button"
                onClick={item.onClick}
                className="select-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                aria-label={item.label}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerRef={searchBtnRef}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        triggerRef={categoriesBtnRef}
      />
    </>
  );
}
