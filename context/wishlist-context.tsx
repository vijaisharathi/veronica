"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { WishlistResponse, WishlistItemDto } from "@/modules/wishlist/wishlist.types";
import { ROUTES } from "@/config/routes";
import { sanitizeReturnUrl } from "@/lib/url";

export interface WishlistContextValue {
  wishlistIds: Set<string>;
  items: WishlistItemDto[];
  count: number;
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  clearWishlist: () => Promise<void>;
  error: string | null;
}

export const WishlistContext = React.createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [wishlistIds, setWishlistIds] = React.useState<Set<string>>(new Set());
  const [items, setItems] = React.useState<WishlistItemDto[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshWishlist = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/wishlist", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.status === 401) {
        // Unauthenticated visitor: clean state
        setWishlistIds(new Set());
        setItems([]);
        setCount(0);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load wishlist");
      }

      const json = await res.json();
      if (json.success && json.data) {
        const payload: WishlistResponse = json.data;
        const newIds = new Set(payload.items.map((i) => i.productId));
        setWishlistIds(newIds);
        setItems(payload.items);
        setCount(payload.count ?? payload.items.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load wishlist");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const redirectToLogin = React.useCallback(() => {
    const currentQuery = searchParams?.toString();
    const fullPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    const safeUrl = sanitizeReturnUrl(fullPath, ROUTES.HOME);
    router.push(`${ROUTES.LOGIN}?returnUrl=${encodeURIComponent(safeUrl)}`);
  }, [pathname, searchParams, router]);

  const isWishlisted = React.useCallback(
    (productId: string): boolean => {
      return wishlistIds.has(productId);
    },
    [wishlistIds]
  );

  const toggleWishlist = React.useCallback(
    async (productId: string): Promise<boolean> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are currently offline. Please reconnect to update your wishlist.");
        return wishlistIds.has(productId);
      }

      const currentlyWishlisted = wishlistIds.has(productId);
      const nextWishlisted = !currentlyWishlisted;

      // Optimistic state update
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (nextWishlisted) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
      setCount((prev) => (nextWishlisted ? prev + 1 : Math.max(0, prev - 1)));

      try {
        if (nextWishlisted) {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

          if (res.status === 401) {
            // Revert optimistic update & redirect to login
            setWishlistIds((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
            setCount((prev) => Math.max(0, prev - 1));
            redirectToLogin();
            return false;
          }

          if (!res.ok) {
            throw new Error("Failed to add to wishlist");
          }

          const json = await res.json();
          if (json.success && json.data) {
            setItems((prev) => [json.data, ...prev.filter((i) => i.productId !== productId)]);
          }
          return true;
        } else {
          const res = await fetch(`/api/wishlist/${productId}`, {
            method: "DELETE",
          });

          if (res.status === 401) {
            setWishlistIds((prev) => new Set(prev).add(productId));
            setCount((prev) => prev + 1);
            redirectToLogin();
            return true;
          }

          if (!res.ok) {
            throw new Error("Failed to remove from wishlist");
          }

          setItems((prev) => prev.filter((i) => i.productId !== productId));
          return false;
        }
      } catch (err: unknown) {
        // Rollback state on error
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (currentlyWishlisted) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        setCount((prev) => (currentlyWishlisted ? prev + 1 : Math.max(0, prev - 1)));
        setError(err instanceof Error ? err.message : "Wishlist update failed");
        return currentlyWishlisted;
      }
    },
    [wishlistIds, redirectToLogin]
  );

  const addToWishlist = React.useCallback(
    async (productId: string): Promise<boolean> => {
      if (wishlistIds.has(productId)) {
        return true;
      }
      return toggleWishlist(productId);
    },
    [wishlistIds, toggleWishlist]
  );

  const removeFromWishlist = React.useCallback(
    async (productId: string): Promise<boolean> => {
      if (!wishlistIds.has(productId)) {
        return true;
      }
      const isStillWishlisted = await toggleWishlist(productId);
      return !isStillWishlisted;
    },
    [wishlistIds, toggleWishlist]
  );

  const clearWishlist = React.useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist", { method: "DELETE" });
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      if (res.ok) {
        setWishlistIds(new Set());
        setItems([]);
        setCount(0);
      }
    } catch {
      setError("Failed to clear wishlist");
    }
  }, [redirectToLogin]);

  const value = React.useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      items,
      count,
      isLoading,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      refreshWishlist,
      clearWishlist,
      error,
    }),
    [
      wishlistIds,
      items,
      count,
      isLoading,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      refreshWishlist,
      clearWishlist,
      error,
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

const defaultWishlistContext: WishlistContextValue = {
  wishlistIds: new Set<string>(),
  items: [],
  count: 0,
  isLoading: false,
  isWishlisted: () => false,
  toggleWishlist: async () => false,
  addToWishlist: async () => false,
  removeFromWishlist: async () => false,
  refreshWishlist: async () => {},
  clearWishlist: async () => {},
  error: null,
};

export function useWishlist(): WishlistContextValue {
  const context = React.useContext(WishlistContext);
  if (!context) {
    return defaultWishlistContext;
  }
  return context;
}
