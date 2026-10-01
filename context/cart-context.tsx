"use client";

import * as React from "react";
import { CartDTO, CartItemDTO } from "@/modules/cart/cart.types";
import { CART_CONFIG } from "@/config/cart";

export interface CartContextValue {
  cart: CartDTO | null;
  items: CartItemDTO[];
  itemCount: number;
  distinctItemCount: number;
  subtotalMinor: number;
  subtotalMajor: number;
  promotionDiscountMinor: number;
  couponDiscountMinor: number;
  totalDiscountMinor: number;
  grandTotalMinor: number;
  grandTotalMajor: number;
  couponCode: string | null;
  couponValidationMessage?: string;
  couponError: string | null;
  isApplyingCoupon: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  isDrawerOpen: boolean;
  error: string | null;
  addToCart: (productId: string, variantId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  moveToWishlist: (itemId: string) => Promise<boolean>;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const CartContext = React.createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isUpdating, setIsUpdating] = React.useState<boolean>(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState<boolean>(false);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshCart = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/cart", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        throw new Error("Unable to retrieve your shopping bag");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading shopping bag");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = React.useCallback(
    async (productId: string, variantId: string, quantity = 1): Promise<boolean> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are currently offline. Please reconnect to update your bag.");
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, variantId, quantity }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to add garment to bag");
        }

        setCart(json.data);
        setIsDrawerOpen(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to add garment to bag");
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const updateQuantity = React.useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are currently offline. Please reconnect to update your bag.");
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update item quantity");
        }

        setCart(json.data);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update item quantity");
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const removeItem = React.useCallback(
    async (itemId: string): Promise<boolean> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are currently offline. Please reconnect to update your bag.");
        return false;
      }

      // Optimistic item removal
      const previousCart = cart;
      if (previousCart) {
        const remainingItems = previousCart.items.filter((i) => i.id !== itemId);
        const newCount = remainingItems.reduce((sum, item) => sum + item.quantity, 0);
        const newSubtotal = remainingItems.reduce((sum, item) => sum + item.lineTotalMinor, 0);

        setCart({
          ...previousCart,
          items: remainingItems,
          itemCount: newCount,
          distinctItemCount: remainingItems.length,
          totals: {
            ...previousCart.totals,
            subtotalMinor: newSubtotal,
            subtotalMajor: Math.round(newSubtotal / 100),
            grandTotalMinor: newSubtotal,
            grandTotalMajor: Math.round(newSubtotal / 100),
          },
        });
      }

      setIsUpdating(true);
      setError(null);

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "DELETE",
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to remove garment from bag");
        }

        setCart(json.data);
        return true;
      } catch (err) {
        // Rollback state on error
        setCart(previousCart);
        setError(err instanceof Error ? err.message : "Failed to remove garment");
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [cart]
  );

  const clearCart = React.useCallback(async (): Promise<boolean> => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setError("You are currently offline. Please reconnect to update your bag.");
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to clear bag");
      }

      setCart(json.data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear bag");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const moveToWishlist = React.useCallback(
    async (itemId: string): Promise<boolean> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are currently offline. Please reconnect to update your bag.");
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const res = await fetch(`/api/cart/items/${itemId}/move-to-wishlist`, {
          method: "POST",
        });

        const json = await res.json();
        if (res.status === 401) {
          setError("Please sign in to move garments to your personal wishlist");
          return false;
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to move garment to wishlist");
        }

        setCart(json.data);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move garment to wishlist");
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const applyCoupon = React.useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        const msg = "You are currently offline. Please reconnect to apply coupons.";
        setCouponError(msg);
        return { success: false, error: msg };
      }

      setIsApplyingCoupon(true);
      setCouponError(null);

      try {
        const res = await fetch("/api/cart/coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const errorMsg = json.error?.message || "Invalid or ineligible coupon code";
          setCouponError(errorMsg);
          return { success: false, error: errorMsg };
        }

        setCart(json.data);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to apply coupon";
        setCouponError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsApplyingCoupon(false);
      }
    },
    []
  );

  const removeCoupon = React.useCallback(async (): Promise<boolean> => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setError("You are currently offline. Please reconnect.");
      return false;
    }

    setIsUpdating(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/cart/coupon", {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to remove coupon");
      }

      setCart(json.data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove coupon");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const openDrawer = React.useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = React.useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = React.useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      items: cart?.items || [],
      itemCount: cart?.itemCount || 0,
      distinctItemCount: cart?.distinctItemCount || 0,
      subtotalMinor: cart?.totals.subtotalMinor || 0,
      subtotalMajor: cart?.totals.subtotalMajor || 0,
      promotionDiscountMinor: cart?.totals.promotionDiscountMinor || 0,
      couponDiscountMinor: cart?.totals.couponDiscountMinor || 0,
      totalDiscountMinor: cart?.totals.discountMinor || 0,
      grandTotalMinor: cart?.totals.grandTotalMinor || 0,
      grandTotalMajor: cart?.totals.grandTotalMajor || 0,
      couponCode: cart?.couponCode ?? null,
      couponValidationMessage: cart?.couponValidationMessage ?? undefined,
      couponError,
      isApplyingCoupon,
      isLoading,
      isUpdating,
      isDrawerOpen,
      error,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      moveToWishlist,
      applyCoupon,
      removeCoupon,
      refreshCart,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [
      cart,
      couponError,
      isApplyingCoupon,
      isLoading,
      isUpdating,
      isDrawerOpen,
      error,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      moveToWishlist,
      applyCoupon,
      removeCoupon,
      refreshCart,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const defaultCartContext: CartContextValue = {
  cart: null,
  items: [],
  itemCount: 0,
  distinctItemCount: 0,
  subtotalMinor: 0,
  subtotalMajor: 0,
  promotionDiscountMinor: 0,
  couponDiscountMinor: 0,
  totalDiscountMinor: 0,
  grandTotalMinor: 0,
  grandTotalMajor: 0,
  couponCode: null,
  couponError: null,
  isApplyingCoupon: false,
  isLoading: false,
  isUpdating: false,
  isDrawerOpen: false,
  error: null,
  addToCart: async () => false,
  updateQuantity: async () => false,
  removeItem: async () => false,
  clearCart: async () => false,
  moveToWishlist: async () => false,
  applyCoupon: async () => ({ success: false }),
  removeCoupon: async () => false,
  refreshCart: async () => {},
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
};

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) {
    return defaultCartContext;
  }
  return context;
}
