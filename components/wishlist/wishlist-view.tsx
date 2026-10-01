"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Sparkles, ArrowRight, Trash2, AlertCircle, WifiOff } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { RecentlyViewed } from "@/components/product/recently-viewed";

export function WishlistView() {
  const { items, count, isLoading, error, refreshWishlist, clearWishlist } = useWishlist();
  const [isClearing, setIsClearing] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleClear = async () => {
    if (window.confirm("Are you sure you wish to clear all saved garments from your wishlist?")) {
      setIsClearing(true);
      try {
        await clearWishlist();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const products = React.useMemo(() => {
    return items.map((i) => i.product);
  }, [items]);

  return (
    <div className="space-y-10">
      {/* Offline Alert */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-4 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>You are currently offline. Changes will not synchronize until you reconnect.</span>
        </div>
      )}

      {/* Page Title & Actions Header */}
      <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
              Client Wardrobe
            </span>
            {!isLoading && (
              <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
                {`${count} ${count === 1 ? "Item" : "Items"}`}
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-light tracking-tight">
            Saved Selections
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Curate personal garments for private atelier fittings, seasonal gifting, and future reservations.
          </p>
        </div>

        {products.length > 0 && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground self-start sm:self-auto"
            aria-label="Clear all saved wishlist items"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isClearing ? "Clearing..." : "Clear Wardrobe"}
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div
          role="alert"
          className="p-6 rounded border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to synchronize your wishlist</span>
          </div>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshWishlist()}
            className="text-xs uppercase tracking-wider"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-3">
              <div className="aspect-portrait-fashion rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Active Wishlist Products Grid */}
      {!isLoading && !error && products.length > 0 && (
        <div className="space-y-6">
          <ProductGrid products={products} />
        </div>
      )}

      {/* Luxury Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="py-16 text-center space-y-6 max-w-md mx-auto">
          <div className="h-16 w-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
            <Heart className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-light text-foreground">
              Your Wishlist Is Empty
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You have not saved any garments to your private atelier selections yet. Explore our latest arrivals to begin curating your edit.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={ROUTES.NEW_ARRIVALS} className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-400" />
                Discover New Season
              </Button>
            </Link>

            <Link href={ROUTES.SHOP} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium"
              >
                Browse All Garments
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Revisit Recently Viewed Silhouettes */}
      <RecentlyViewed
        title="Recently Explored Silhouettes"
        subtitle="Artisanal pieces you recently discovered across the maison."
      />
    </div>
  );
}
