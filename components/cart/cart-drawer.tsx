"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, AlertCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { MAX_CART_ITEM_QUANTITY } from "@/config/cart";

export function CartDrawer() {
  const {
    items,
    itemCount,
    subtotalMinor,
    grandTotalMinor,
    totalDiscountMinor,
    couponCode,
    isLoading,
    isUpdating,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    error,
  } = useCart();

  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl transition-transform duration-300 border-l border-border"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-foreground" />
            <h2 className="font-serif text-lg font-light tracking-wide text-foreground">
              Shopping Bag
            </h2>
            <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-mono">
              {itemCount} {itemCount === 1 ? "Item" : "Items"}
            </Badge>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping bag drawer"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Notice if any */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-border/60">
          {isLoading && !items.length ? (
            <div className="space-y-4 py-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-4 py-3">
                  <div className="h-20 w-16 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-4 w-1/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-light text-foreground">
                  Your Bag Is Empty
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Your curated wardrobe has no reserved silhouettes. Explore our artisanal pieces.
                </p>
              </div>
              <Link href={ROUTES.SHOP} onClick={closeDrawer} className="pt-2">
                <Button size="sm" variant="outline" className="text-xs uppercase tracking-wider">
                  Discover Silhouettes
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4 group">
                {/* Thumbnail Image */}
                <Link
                  href={item.slug ? ROUTES.PRODUCT(item.slug) : ROUTES.SHOP}
                  onClick={closeDrawer}
                  className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-900 border border-border/60"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      sizes="80px"
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      VÉRONA
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
                        {item.brand}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                        aria-label={`Remove ${item.productName} from bag`}
                        className="text-neutral-400 hover:text-red-600 transition-colors p-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Link
                      href={item.slug ? ROUTES.PRODUCT(item.slug) : ROUTES.SHOP}
                      onClick={closeDrawer}
                      className="block text-xs font-medium text-foreground hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors line-clamp-1"
                    >
                      {item.productName}
                    </Link>

                    {/* Color & Size Specs */}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span>{item.selectedColor}</span>
                      <span>/</span>
                      <span className="font-semibold text-foreground uppercase">{item.selectedSize}</span>
                    </div>

                    {/* Status Warnings */}
                    {item.priceChanged && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>Price updated in catalog</span>
                      </div>
                    )}
                    {item.availability !== "AVAILABLE" && item.availability !== "PRICE_CHANGED" && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 font-mono">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{item.availability === "OUT_OF_STOCK" ? "Out of Stock" : "Unavailable"}</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Line Total */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isUpdating}
                        aria-label={`Decrease quantity of ${item.productName}`}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span
                        className="px-2.5 text-xs font-mono font-medium text-foreground min-w-[1.75rem] text-center"
                        aria-label={`Current quantity ${item.quantity}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating || item.quantity >= MAX_CART_ITEM_QUANTITY}
                        aria-label={`Increase quantity of ${item.productName}`}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Pricing */}
                    <div className="text-right">
                      <div className="text-xs font-semibold text-foreground">
                        {formatMoney(item.lineTotalMinor)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {formatMoney(item.unitPriceMinor)} each
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="border-t border-border/80 bg-neutral-50/50 dark:bg-neutral-900/50 p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                  Subtotal
                </span>
                <span className="text-sm font-serif font-medium text-foreground">
                  {formatMoney(subtotalMinor)}
                </span>
              </div>

              {totalDiscountMinor > 0 && (
                <div className="flex items-baseline justify-between text-emerald-700 dark:text-emerald-400">
                  <span className="text-[11px] font-mono">
                    {couponCode ? `Voucher & Promo (${couponCode})` : "Promotion Savings"}
                  </span>
                  <span className="text-xs font-mono font-medium">
                    - {formatMoney(totalDiscountMinor)}
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
                <span className="text-xs uppercase tracking-wider font-mono font-semibold text-foreground">
                  Estimated Total
                </span>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-serif font-medium text-foreground">
                    {formatMoney(grandTotalMinor > 0 ? grandTotalMinor : subtotalMinor)}
                  </span>
                  <span className="block text-[10px] font-mono text-muted-foreground">
                    Complimentary Atelier Delivery
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Link href={ROUTES.CART} onClick={closeDrawer} className="block w-full">
                <Button size="lg" className="w-full uppercase tracking-widest text-xs font-semibold py-3.5">
                  View Bag & Order Summary
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={closeDrawer}
                className="w-full text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Continue Exploring
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
