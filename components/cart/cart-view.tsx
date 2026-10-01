"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Heart,
  AlertCircle,
  WifiOff,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { MAX_CART_ITEM_QUANTITY } from "@/config/cart";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export function CartView() {
  const {
    items,
    itemCount,
    subtotalMinor,
    promotionDiscountMinor,
    couponDiscountMinor,
    totalDiscountMinor,
    grandTotalMinor,
    couponCode,
    couponValidationMessage,
    couponError,
    isApplyingCoupon,
    isLoading,
    isUpdating,
    error,
    updateQuantity,
    removeItem,
    clearCart,
    moveToWishlist,
    applyCoupon,
    removeCoupon,
    refreshCart,
  } = useCart();

  const [inputCouponCode, setInputCouponCode] = React.useState("");
  const [couponSuccessMessage, setCouponSuccessMessage] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

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
    if (window.confirm("Are you sure you wish to clear all garments from your shopping bag?")) {
      setIsClearing(true);
      try {
        await clearCart();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleMoveToWishlist = async (itemId: string) => {
    setActionError(null);
    const success = await moveToWishlist(itemId);
    if (!success) {
      setActionError("Please log in to your account to save garments to your wishlist.");
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCouponCode.trim()) return;
    setCouponSuccessMessage(null);
    const result = await applyCoupon(inputCouponCode.trim());
    if (result.success) {
      setCouponSuccessMessage(`Coupon applied successfully.`);
      setInputCouponCode("");
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponSuccessMessage(null);
    await removeCoupon();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumbs items={[{ label: "Shopping Bag" }]} />

      {/* Offline Banner */}
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

      {/* Global Error Banner */}
      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error || actionError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshCart()}
            className="text-[10px] uppercase tracking-wider h-7 px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
              Client Wardrobe
            </span>
            {!isLoading && (
              <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-mono">
                {`${itemCount} ${itemCount === 1 ? "Item" : "Items"}`}
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-light tracking-tight">
            Your Shopping Bag
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            All orders include insured white-glove doorstep delivery, complimentary atelier garment bags, and 14-day returns.
          </p>
        </div>

        {items.length > 0 && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing || isUpdating}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground self-start sm:self-auto"
            aria-label="Clear all garments from bag"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isClearing ? "Clearing..." : "Clear Bag"}
          </Button>
        )}
      </div>

      {/* Skeleton Loading State */}
      {isLoading && !items.length && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-8 space-y-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex gap-6 p-6 rounded border border-border/60 bg-surface">
                <div className="aspect-portrait-fashion w-28 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-5 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-4 w-1/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-4 h-64 bg-neutral-100 dark:bg-neutral-900 rounded border border-border/60" />
        </div>
      )}

      {/* Luxury Empty Bag State */}
      {!isLoading && items.length === 0 && (
        <div className="py-20 text-center space-y-6 max-w-md mx-auto">
          <div className="h-20 w-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400">
            <ShoppingBag className="h-9 w-9 stroke-[1.25]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-light text-foreground">
              Your Shopping Bag Is Empty
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              There are currently no garments reserved in your bag. Explore our curated collections across Men&apos;s and Women&apos;s ateliers to add pieces.
            </p>
          </div>

          <div className="pt-2">
            <Link href={ROUTES.SHOP}>
              <Button size="lg" className="text-xs uppercase tracking-widest font-semibold px-8">
                Discover Silhouettes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Active Cart Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Items List (Left Column) */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="group relative flex flex-col sm:flex-row gap-5 p-5 sm:p-6 rounded bg-surface border border-border/80 transition-all hover:border-border"
              >
                {/* Garment Image */}
                <Link
                  href={item.slug ? ROUTES.PRODUCT(item.slug) : ROUTES.SHOP}
                  className="relative aspect-portrait-fashion w-full sm:w-32 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-900 border border-border/60"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      sizes="(max-width: 640px) 100vw, 150px"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-mono text-muted-foreground">
                      VÉRONA
                    </div>
                  )}
                </Link>

                {/* Details & Actions */}
                <div className="flex flex-1 flex-col justify-between space-y-4 min-w-0">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                          {item.brand}
                        </span>
                        <Link
                          href={item.slug ? ROUTES.PRODUCT(item.slug) : ROUTES.SHOP}
                          className="block text-sm sm:text-base font-serif font-light text-foreground hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                      </div>

                      {/* Line Total */}
                      <div className="text-right shrink-0">
                        <span className="text-sm sm:text-base font-semibold text-foreground">
                          {formatMoney(item.lineTotalMinor)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="block text-[11px] font-mono text-muted-foreground">
                            {formatMoney(item.unitPriceMinor)} each
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specifications: Color, Size, SKU */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">Color:</span>
                        <span className="text-foreground font-medium">{item.selectedColor}</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">Size:</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0">
                          {item.selectedSize}
                        </Badge>
                      </div>
                      {item.sku && (
                        <>
                          <span className="text-border">•</span>
                          <span className="text-[10px] text-muted-foreground">
                            SKU: {item.sku}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Status Alerts */}
                    {item.priceChanged && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900/60 font-mono text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Catalog price updated from {item.previousPriceMinor ? formatMoney(item.previousPriceMinor) : "previous"} to {formatMoney(item.unitPriceMinor)}.
                        </span>
                      </div>
                    )}

                    {item.availability !== "AVAILABLE" && item.availability !== "PRICE_CHANGED" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60 font-mono text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {item.availability === "OUT_OF_STOCK"
                            ? "This garment variant is currently out of stock."
                            : "This product is no longer active in our current collection."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Action Suite */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/60">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isUpdating}
                        aria-label={`Decrease quantity of ${item.productName}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className="px-3 text-xs font-mono font-medium text-foreground min-w-[2rem] text-center"
                        aria-label={`Current quantity ${item.quantity}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating || item.quantity >= MAX_CART_ITEM_QUANTITY}
                        aria-label={`Increase quantity of ${item.productName}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Secondary Actions: Move to Wishlist, Remove */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleMoveToWishlist(item.id)}
                        disabled={isUpdating}
                        aria-label={`Move ${item.productName} to wishlist`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        <span>Save to Wishlist</span>
                      </button>

                      <span className="text-border">|</span>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                        aria-label={`Remove ${item.productName} from bag`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Order Summary (Right Column) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="rounded border border-border/80 bg-surface p-6 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  Atelier Dispatch
                </span>
                <h2 className="font-serif text-xl font-light text-foreground">
                  Order Summary
                </h2>
              </div>

              {/* Coupon Redemption Section */}
              <div className="space-y-3 pt-1 border-t border-border/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Privilege Voucher / Promo Code
                </span>

                {couponCode ? (
                  <div className="flex items-center justify-between p-3 rounded bg-neutral-100 dark:bg-neutral-800/80 border border-border">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                          {couponCode}
                        </span>
                      </div>
                      {couponDiscountMinor > 0 && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                          Saved {formatMoney(couponDiscountMinor)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      disabled={isUpdating}
                      aria-label="Remove applied coupon"
                      className="text-[10px] font-mono uppercase text-muted-foreground hover:text-red-600 transition-colors p-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputCouponCode}
                        onChange={(e) => setInputCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. VÉR20"
                        disabled={isApplyingCoupon || items.length === 0}
                        aria-label="Enter promotional voucher or coupon code"
                        className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={!inputCouponCode.trim() || isApplyingCoupon || items.length === 0}
                        className="text-[10px] uppercase font-mono tracking-wider px-3 h-auto"
                      >
                        {isApplyingCoupon ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Coupon Feedback Messages */}
                {couponSuccessMessage && (
                  <p role="status" aria-live="polite" className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>{couponSuccessMessage}</span>
                  </p>
                )}
                {(couponError || couponValidationMessage) && (
                  <p role="alert" aria-live="assertive" className="text-[11px] text-red-600 dark:text-red-400 font-mono flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{couponError || couponValidationMessage}</span>
                  </p>
                )}
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 border-t border-b border-border/80 py-4 text-xs font-mono">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Catalog Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                  <span className="text-foreground font-semibold font-sans">
                    {formatMoney(subtotalMinor)}
                  </span>
                </div>

                {promotionDiscountMinor > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Campaign Promotion</span>
                    <span className="font-semibold font-sans">
                      - {formatMoney(promotionDiscountMinor)}
                    </span>
                  </div>
                )}

                {couponDiscountMinor > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Privilege Voucher ({couponCode})</span>
                    <span className="font-semibold font-sans">
                      - {formatMoney(couponDiscountMinor)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    <span>Insured Delivery</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold uppercase text-[10px]">
                    Complimentary
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Complimentary Returns</span>
                  </div>
                  <span className="text-foreground">14 Days</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="font-serif text-lg text-foreground">Estimated Total</span>
                  {totalDiscountMinor > 0 && (
                    <span className="block text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      Total savings: {formatMoney(totalDiscountMinor)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-serif text-2xl font-light text-foreground">
                    {formatMoney(grandTotalMinor > 0 || items.length === 0 ? grandTotalMinor : subtotalMinor)}
                  </span>
                  <span className="block text-[10px] font-mono text-muted-foreground">
                    Taxes calculated at checkout
                  </span>
                </div>
              </div>

              {/* Checkout Action CTA */}
              <div className="space-y-3 pt-2">
                {items.length > 0 ? (
                  <Link href={ROUTES.CHECKOUT} className="block w-full">
                    <Button
                      size="lg"
                      className="w-full tracking-widest text-xs font-semibold py-4 uppercase"
                    >
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    disabled={true}
                    className="w-full tracking-widest text-xs font-semibold py-4 uppercase"
                  >
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {/* Secure Checkout Note */}
                <div className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded text-[11px] text-muted-foreground border border-border/60 leading-relaxed">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    Your garment selections and pricing are securely verified before payment. Complimentary shipping across India.
                  </span>
                </div>
              </div>
            </div>

            {/* Atelier Assurance Badges */}
            <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-mono text-muted-foreground">
              <div className="p-3 rounded border border-border/60 bg-surface/50 space-y-1">
                <Sparkles className="h-4 w-4 mx-auto text-amber-600 dark:text-amber-400" />
                <span className="block font-medium text-foreground">100% Authentic</span>
                <span>Crafted in Verified Ateliers</span>
              </div>
              <div className="p-3 rounded border border-border/60 bg-surface/50 space-y-1">
                <ShieldCheck className="h-4 w-4 mx-auto text-emerald-600 dark:text-emerald-400" />
                <span className="block font-medium text-foreground">Insured Transit</span>
                <span>Direct Doorstep Hand-off</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Rail: Recently Viewed Silhouettes */}
      <section className="pt-8">
        <RecentlyViewed
          title="Silhouettes You Recently Explored"
          subtitle="Revisit garments from your atelier exploration or add them to your bag."
        />
      </section>
    </div>
  );
}
