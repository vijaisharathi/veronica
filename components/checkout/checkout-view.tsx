"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  MapPin,
  Truck,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Lock,
  Clock,
  WifiOff,
  ShoppingBag,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressSelector } from "@/components/address/address-selector";
import { AddressDTO } from "@/modules/addresses/address.types";
import {
  CheckoutDTO,
  CheckoutIssueCode,
} from "@/modules/checkout/checkout.types";
import {
  PaymentInitializationDTO,
  PaymentVerificationDTO,
} from "@/modules/payments/types/payment.types";
import { OrderDTO } from "@/modules/orders/types/order.types";
import { loadRazorpayScript } from "@/lib/payments/razorpay-client";
import { formatMoney } from "@/lib/money";
import { ROUTES } from "@/config/routes";

export interface CheckoutViewProps {
  initialCheckout?: CheckoutDTO | null;
}

export function CheckoutView({ initialCheckout }: CheckoutViewProps) {
  const router = useRouter();
  const [checkout, setCheckout] = React.useState<CheckoutDTO | null>(initialCheckout || null);
  const [addresses, setAddresses] = React.useState<AddressDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(!initialCheckout);
  const [isUpdatingAddress, setIsUpdatingAddress] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const [priceChangeAnnounced, setPriceChangeAnnounced] = React.useState<string | null>(null);

  // Phase 18 Payment & Phase 19 Order States
  const [paymentStatus, setPaymentStatus] = React.useState<
    "IDLE" | "PREPARING" | "GATEWAY_OPEN" | "VERIFYING" | "CAPTURED" | "FAILED"
  >("IDLE");
  const [capturedPayment, setCapturedPayment] = React.useState<PaymentVerificationDTO | null>(null);
  const [createdOrder, setCreatedOrder] = React.useState<OrderDTO | null>(null);
  const [activePaymentId, setActivePaymentId] = React.useState<string | null>(null);

  // Monitor offline state
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

  // Fetch or initialize checkout and addresses on load
  const loadCheckoutAndAddresses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);

      // 1. Fetch saved addresses
      const addrRes = await fetch("/api/addresses");
      const addrJson = await addrRes.json();
      if (addrRes.ok && addrJson.success) {
        setAddresses(addrJson.data || []);
      }

      // 2. Initialize or fetch active checkout session
      const chkRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const chkJson = await chkRes.json();

      if (!chkRes.ok || !chkJson.success) {
        if (chkJson?.error?.code === CheckoutIssueCode.CART_EMPTY) {
          router.push(ROUTES.CART);
          return;
        }
        throw new Error(chkJson?.error?.message || "Failed to initialize checkout");
      }

      const activeCheckout: CheckoutDTO = chkJson.data;
      setCheckout(activeCheckout);

      // Check if price changed to announce to screen readers
      const priceChangeIssue = activeCheckout.issues.find(
        (i) => i.code === CheckoutIssueCode.PRICE_CHANGED
      );
      if (priceChangeIssue) {
        setPriceChangeAnnounced(
          `Your order total has changed to ${formatMoney(
            activeCheckout.pricing.amountDueBeforePaymentMinor
          )}. Please review before continuing.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading checkout";
      setPageError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadCheckoutAndAddresses();
  }, [loadCheckoutAndAddresses]);

  // Handle address selection change
  const handleSelectAddress = async (selectedAddr: AddressDTO) => {
    if (!checkout) return;
    setIsUpdatingAddress(true);
    setPageError(null);

    try {
      const res = await fetch(`/api/checkout/${checkout.id}/address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddr.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to update delivery address");
      }
      setCheckout(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating address";
      setPageError(msg);
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  // Revalidate or refresh checkout
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCheckoutAndAddresses();
    setIsRefreshing(false);
  };

  // Trigger Razorpay Modal with given initialization DTO
  const launchRazorpayCheckout = async (paymentInit: PaymentInitializationDTO) => {
    setActivePaymentId(paymentInit.paymentId);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error("Unable to initialize secure payment gateway. Please check your network connection.");
    }

    setPaymentStatus("GATEWAY_OPEN");

    const options = {
      key: paymentInit.publicKeyId,
      amount: paymentInit.amountMinor,
      currency: paymentInit.currency,
      name: "VÉRONA Atelier",
      description: "Haute Couture & Fine Garments",
      order_id: paymentInit.providerOrderId,
      prefill: {
        name: paymentInit.customer?.name || "",
        email: paymentInit.customer?.email || "",
        contact: paymentInit.customer?.phone || "",
      },
      theme: {
        color: "#171717",
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        setPaymentStatus("VERIFYING");
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: paymentInit.paymentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (!verifyRes.ok || !verifyJson.success) {
            throw new Error(verifyJson?.error?.message || "Payment verification failed");
          }

          setCapturedPayment(verifyJson.data);

          // Phase 19: Formulate order from verified payment
          try {
            const orderRes = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: paymentInit.paymentId,
              }),
            });
            const orderJson = await orderRes.json();
            if (orderRes.ok && orderJson.success) {
              setCreatedOrder(orderJson.data);
            }
          } catch (orderErr) {
            console.error("Order creation deferred or encountered transient issue:", orderErr);
          }

          setPaymentStatus("CAPTURED");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Payment verification failed";
          setPageError(msg);
          setPaymentStatus("FAILED");
        }
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus((prev) => (prev === "CAPTURED" ? "CAPTURED" : "IDLE"));
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
      setPageError(response?.error?.description || "Payment attempt failed. You may retry safely.");
      setPaymentStatus("FAILED");
    });
    rzp.open();
  };

  // Pre-payment validation & Payment initiation
  const handleContinueToPayment = async () => {
    if (!checkout) return;
    setPaymentStatus("PREPARING");
    setPageError(null);

    try {
      // 1. Authoritative validate call
      const valRes = await fetch(`/api/checkout/${checkout.id}/validate`, {
        method: "POST",
      });
      const valJson = await valRes.json();
      if (!valRes.ok || !valJson.success) {
        throw new Error(valJson?.error?.message || "Checkout validation failed");
      }

      const { valid, issues, checkout: updatedCheckout } = valJson.data;
      setCheckout(updatedCheckout);

      if (!valid || issues.length > 0) {
        const topIssue = issues[0]?.message || "Please resolve all issues to proceed";
        setPageError(topIssue);
        setPaymentStatus("IDLE");
        return;
      }

      // 2. Server-side payment order initiation (Razorpay Order)
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutSessionId: checkout.id }),
      });
      const payJson = await payRes.json();
      if (!payRes.ok || !payJson.success) {
        throw new Error(payJson?.error?.message || "Payment initiation failed");
      }

      const paymentInit: PaymentInitializationDTO = payJson.data;
      await launchRazorpayCheckout(paymentInit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Validation or payment error occurred";
      setPageError(msg);
      setPaymentStatus("FAILED");
    }
  };

  // Handle Payment Retry
  const handleRetryPayment = async () => {
    if (!activePaymentId) {
      await handleContinueToPayment();
      return;
    }

    setPaymentStatus("PREPARING");
    setPageError(null);

    try {
      const retryRes = await fetch(`/api/payments/${activePaymentId}/retry`, {
        method: "POST",
      });
      const retryJson = await retryRes.json();
      if (!retryRes.ok || !retryJson.success) {
        throw new Error(retryJson?.error?.message || "Failed to initiate payment retry");
      }

      const paymentInit: PaymentInitializationDTO = retryJson.data;
      await launchRazorpayCheckout(paymentInit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment retry failed";
      setPageError(msg);
      setPaymentStatus("FAILED");
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-12 px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-48 bg-neutral-100 dark:bg-neutral-900 rounded border border-border" />
            <div className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded border border-border" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-80 bg-neutral-100 dark:bg-neutral-900 rounded border border-border" />
          </div>
        </div>
      </div>
    );
  }

  // Phase 19 Confirmed Order & Verified Payment Screen
  if (paymentStatus === "CAPTURED" && (capturedPayment || createdOrder)) {
    const orderNumber = createdOrder?.orderNumber || "CONFIRMING...";
    const orderTotal = createdOrder?.pricing.totalMinor ?? capturedPayment?.amountMinor ?? 0;

    return (
      <div className="container mx-auto max-w-3xl py-16 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-8 md:p-10 shadow-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <span className="block text-[11px] font-mono uppercase tracking-[0.25em] text-primary">
              Couture Order Confirmed
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-foreground">
              Thank You for Your Order
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your bespoke atelier garments have been officially confirmed and logged under order reference{" "}
              <span className="font-mono font-semibold text-foreground">{orderNumber}</span>.
            </p>
          </div>

          {/* Confirmed Order & Payment Details */}
          <div className="rounded border border-border/80 bg-surface/40 p-5 space-y-4 font-mono text-xs">
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground uppercase">Order Number</span>
              <span className="font-semibold text-foreground">{orderNumber}</span>
            </div>
            {capturedPayment?.paymentId && (
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground uppercase">Payment Reference</span>
                <span className="text-foreground">{capturedPayment.paymentId}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground uppercase">Order Status</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px]">
                {createdOrder?.status || "CONFIRMED"}
              </Badge>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground uppercase">Total Amount Paid</span>
              <span className="font-bold text-foreground text-sm">
                {formatMoney(orderTotal)}
              </span>
            </div>
            {createdOrder?.shippingAddress && (
              <div className="border-b border-border/60 pb-2 pt-1 font-sans text-xs">
                <span className="font-mono text-muted-foreground uppercase block text-[11px] mb-1">
                  Delivery Destination
                </span>
                <p className="font-medium text-foreground">{createdOrder.shippingAddress.fullName}</p>
                <p className="text-muted-foreground">
                  {createdOrder.shippingAddress.addressLine1}
                  {createdOrder.shippingAddress.addressLine2 ? `, ${createdOrder.shippingAddress.addressLine2}` : ""},{" "}
                  {createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.state} — {createdOrder.shippingAddress.pincode}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {createdOrder && (
              <Link href={ROUTES.ACCOUNT_ORDER_DETAIL(createdOrder.orderNumber)} className="w-full">
                <Button className="w-full tracking-wider text-xs uppercase">
                  View Order Details
                </Button>
              </Link>
            )}
            <Link href={ROUTES.ACCOUNT_ORDERS} className="w-full">
              <Button
                variant={createdOrder ? "outline" : "primary"}
                className="w-full tracking-wider text-xs uppercase"
              >
                All Customer Orders
              </Button>
            </Link>
            <Link href={ROUTES.SHOP} className="w-full">
              <Button
                variant="outline"
                className="w-full tracking-wider text-xs uppercase"
              >
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Normal Checkout Review View
  return (
    <div className="container mx-auto max-w-6xl py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Screen Reader ARIA Live Region for Price Changes */}
      <div aria-live="assertive" className="sr-only">
        {priceChangeAnnounced}
      </div>

      {/* Breadcrumb / Top Bar */}
      <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">
            VÉRONA Atelier Checkout
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-light text-foreground">
            Order Review & Payment
          </h1>
          <p className="text-xs text-muted-foreground">
            Review delivery destination, garment specifications, and verified pricing before payment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading || paymentStatus === "PREPARING" || paymentStatus === "VERIFYING"}
            className="text-xs tracking-wider uppercase h-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Network / Offline Warning */}
      {isOffline && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">You are currently offline</p>
            <p className="mt-0.5">Please reconnect to verify your checkout and proceed to payment.</p>
          </div>
        </div>
      )}

      {/* Page Errors or Checkout Issues Banner */}
      {pageError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start justify-between gap-3 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Payment Attention Required</p>
              <p>{pageError}</p>
            </div>
          </div>
          {paymentStatus === "FAILED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryPayment}
              className="text-[11px] uppercase tracking-wider shrink-0 h-8"
            >
              Retry Payment
            </Button>
          )}
        </div>
      )}

      {checkout && checkout.issues.length > 0 && !pageError && (
        <div className="space-y-2">
          {checkout.issues.map((issue, idx) => (
            <div
              key={idx}
              className={`rounded border p-3 text-xs flex items-start gap-2.5 ${
                issue.code === CheckoutIssueCode.PRICE_CHANGED
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {issue.code.replace(/_/g, " ")}
                </span>
                <p>{issue.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Address, Serviceability, Items Review */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Delivery Address */}
          <section aria-labelledby="delivery-address-heading" className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 id="delivery-address-heading" className="font-serif text-lg font-light text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              1. Delivery Destination
            </h2>

            <AddressSelector
              addresses={addresses}
              selectedAddressId={checkout?.selectedAddressId}
              onSelectAddress={handleSelectAddress}
              onAddressCreated={(newAddr) => {
                setAddresses((prev) => [...prev, newAddr]);
                handleSelectAddress(newAddr);
              }}
              onAddressUpdated={(updAddr) => {
                setAddresses((prev) => prev.map((a) => (a.id === updAddr.id ? updAddr : a)));
                if (checkout?.selectedAddressId === updAddr.id) {
                  handleSelectAddress(updAddr);
                }
              }}
              onAddressDeleted={(delId) => {
                setAddresses((prev) => prev.filter((a) => a.id !== delId));
              }}
              isLoading={isUpdatingAddress}
            />
          </section>

          {/* Section 2: Delivery Serviceability Feedback */}
          <section aria-labelledby="serviceability-heading" className="rounded-lg border border-border bg-card p-6 space-y-3">
            <h2 id="serviceability-heading" className="font-serif text-lg font-light text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              2. Delivery Logistics & Serviceability
            </h2>

            {checkout?.serviceability ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {checkout.serviceability.serviceable ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Serviceable to PIN {checkout.serviceability.postalCode}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unavailable to PIN {checkout.serviceability.postalCode}
                    </Badge>
                  )}
                  {checkout.serviceability.city && (
                    <span className="text-xs text-muted-foreground">
                      {checkout.serviceability.city}, {checkout.serviceability.stateName || checkout.serviceability.state}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  {checkout.serviceability.serviceable ? (
                    <p>
                      Estimated doorstep hand-off within{" "}
                      <strong className="text-foreground font-semibold">
                        {checkout.serviceability.estimatedDeliveryDays || 3} business days
                      </strong>{" "}
                      via {checkout.serviceability.source || "VÉRONA Express Atelier Transit"}.
                    </p>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">
                      {checkout.serviceability.reason ||
                        "Our courier network does not currently deliver to this postal code. Please select an alternate destination."}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a delivery destination above to verify postal serviceability.
              </p>
            )}
          </section>

          {/* Section 3: Order Items Review */}
          <section aria-labelledby="order-items-heading" className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="order-items-heading" className="font-serif text-lg font-light text-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                3. Order Items ({checkout?.items.length || 0})
              </h2>
              <Link href={ROUTES.CART}>
                <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider h-8">
                  Edit Bag
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {checkout?.items.map((item) => (
                <div key={item.itemId} className="py-4 flex gap-4 items-center">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800 border border-border/40">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        className="object-cover object-center"
                        sizes="64px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px]">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {item.brandName || "VÉRONA"}
                    </span>
                    <h3 className="text-xs font-medium text-foreground truncate">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Size: <strong>{item.size}</strong></span>
                      <span>•</span>
                      <span>Color: <strong>{item.colorName}</strong></span>
                      <span>•</span>
                      <span>Qty: <strong>{item.quantity}</strong></span>
                    </div>

                    {item.priceChanged && (
                      <span className="inline-block text-[10px] text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                        Price updated from {formatMoney(item.previousPriceMinor || 0)}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-serif text-sm font-medium text-foreground">
                      {formatMoney(item.lineTotalMinor)}
                    </span>
                    <span className="block text-[10px] font-mono text-muted-foreground">
                      {formatMoney(item.unitPriceMinor)} each
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Pricing Breakdown & Payment CTA */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6 shadow-sm">
            <div className="space-y-1 border-b border-border/80 pb-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Authoritative Breakdown
              </span>
              <h2 className="font-serif text-xl font-light text-foreground">
                Pricing & Payment
              </h2>
            </div>

            {/* Pricing Rows */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({checkout?.items.reduce((acc, i) => acc + i.quantity, 0) || 0} garments)</span>
                <span className="font-mono text-foreground">
                  {formatMoney(checkout?.pricing.subtotalMinor || 0)}
                </span>
              </div>

              {Boolean(checkout?.pricing.promotionDiscountMinor) && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Atelier Promotion</span>
                  <span className="font-mono font-medium">
                    - {formatMoney(checkout?.pricing.promotionDiscountMinor || 0)}
                  </span>
                </div>
              )}

              {Boolean(checkout?.pricing.couponDiscountMinor) && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>
                    Voucher Discount {checkout?.appliedCoupon?.code ? `(${checkout.appliedCoupon.code})` : ""}
                  </span>
                  <span className="font-mono font-medium">
                    - {formatMoney(checkout?.pricing.couponDiscountMinor || 0)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Insured Delivery
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 uppercase text-[10px] font-mono font-semibold">
                  Complimentary
                </span>
              </div>

              <div className="border-t border-border/80 pt-4 flex items-baseline justify-between">
                <div>
                  <span className="font-serif text-lg text-foreground">Final Total</span>
                  <span className="block text-[10px] font-mono text-muted-foreground">
                    Inclusive of all atelier taxes
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif text-2xl font-light text-foreground">
                    {formatMoney(checkout?.pricing.amountDueBeforePaymentMinor || 0)}
                  </span>
                  {Boolean(checkout?.pricing.totalDiscountMinor) && (
                    <span className="block text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                      Total savings: {formatMoney(checkout?.pricing.totalDiscountMinor || 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon / Voucher Pill if present */}
            {checkout?.appliedCoupon && (
              <div className="p-3 rounded border border-border bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono font-semibold text-foreground">
                    {checkout.appliedCoupon.code}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  Applied
                </Badge>
              </div>
            )}

            {/* Payment Method Badge */}
            <div className="p-3 rounded border border-border/60 bg-surface/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-neutral-500" />
                <span className="text-foreground">Razorpay Secure Checkout</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">UPI / Cards / NetBanking</span>
            </div>

            {/* Session Expiration Timer Banner */}
            {checkout?.expiresAt && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-surface/50 p-2.5 rounded border border-border/60">
                <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span>
                  Pricing verified. Session expires at{" "}
                  <strong>{new Date(checkout.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>.
                </span>
              </div>
            )}

            {/* Action CTA: Continue to Payment / Pay Now */}
            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                onClick={paymentStatus === "FAILED" ? handleRetryPayment : handleContinueToPayment}
                disabled={
                  paymentStatus === "PREPARING" ||
                  paymentStatus === "GATEWAY_OPEN" ||
                  paymentStatus === "VERIFYING" ||
                  isLoading ||
                  !checkout?.canProceedToPayment ||
                  isOffline
                }
                className="w-full tracking-widest text-xs font-semibold py-4 uppercase"
              >
                {paymentStatus === "PREPARING" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Gateway...
                  </>
                ) : paymentStatus === "GATEWAY_OPEN" ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4 animate-pulse" />
                    Awaiting Payment...
                  </>
                ) : paymentStatus === "VERIFYING" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Payment...
                  </>
                ) : paymentStatus === "FAILED" ? (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Retry Payment
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-3.5 w-3.5" />
                    Pay with Razorpay
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>End-to-End Cryptographic Verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
