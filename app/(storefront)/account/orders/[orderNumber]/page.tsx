"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  MapPin,
  CreditCard,
  Tag,
  XCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import { OrderReturnExchangeModal } from "@/components/returns/order-return-exchange-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/money";
import { ROUTES } from "@/config/routes";
import {
  OrderDTO,
  OrderCancellationReason,
} from "@/modules/orders/types/order.types";
import { OrderStatus } from "@/constants/status";

function getStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400";
    case OrderStatus.PROCESSING:
    case OrderStatus.PACKED:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400";
    case OrderStatus.SHIPPED:
    case OrderStatus.OUT_FOR_DELIVERY:
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400";
    case OrderStatus.DELIVERED:
      return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400";
    case OrderStatus.CANCELLED:
    case OrderStatus.PAYMENT_FAILED:
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400";
    default:
      return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = (params?.orderNumber as string) || "";

  const [order, setOrder] = React.useState<OrderDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState<OrderCancellationReason>(
    OrderCancellationReason.CUSTOMER_CHANGED_MIND
  );
  const [cancelNotes, setCancelNotes] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Return / Exchange Modal State
  const [isReturnOpen, setIsReturnOpen] = React.useState(false);

  const fetchOrderDetail = React.useCallback(async () => {
    if (!orderNumber) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderNumber}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Order not found");
      }
      setOrder(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve order details";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  React.useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason,
          notes: cancelNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Unable to cancel order");
      }

      setOrder(json.data);
      setIsCancelOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-20 px-4 flex flex-col items-center justify-center space-y-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground tracking-wider uppercase font-mono">
          Loading order details...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-3xl py-16 px-4 space-y-6">
        <Link href={ROUTES.ACCOUNT_ORDERS}>
          <Button variant="ghost" size="sm" className="text-xs tracking-wider uppercase">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Orders
          </Button>
        </Link>
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-start gap-3 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Order Not Available</p>
            <p className="text-xs">{error || "The requested order could not be located."}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(ROUTES.ACCOUNT_ORDERS)}
              className="text-xs tracking-wider uppercase mt-2"
            >
              Return to Order History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href={ROUTES.ACCOUNT_ORDERS}>
          <Button variant="ghost" size="sm" className="text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            All Orders
          </Button>
        </Link>

        {order.canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCancelOpen(true)}
            className="text-xs uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:hover:bg-rose-950/30"
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Cancel Order
          </Button>
        )}
      </div>

      {/* Order Header Card */}
      <div className="rounded-lg border border-border/80 bg-card p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary block">
              VÉRONA Atelier Order
            </span>
            <h1 className="font-mono text-2xl font-bold tracking-wider text-foreground">
              {order.orderNumber}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Placed on {dateStr}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 tracking-wider uppercase ${getStatusBadgeClass(order.status)}`}
              >
                {order.status.replace(/_/g, " ")}
              </Badge>
              {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PAYMENT_FAILED && (
                <Link
                  href={`/account/orders/${order.orderNumber}/tracking`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Truck className="mr-1.5 h-3.5 w-3.5" />
                  Live Tracking
                </Link>
              )}
              {order.status === OrderStatus.DELIVERED && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReturnOpen(true)}
                  className="text-xs uppercase tracking-wider flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return / Exchange
                </Button>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Grand Total: <strong className="text-foreground text-sm">{formatMoney(order.pricing.totalMinor)}</strong>
            </span>
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {order.status === OrderStatus.CANCELLED && order.cancellation && (
          <div className="rounded border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Order Cancelled</span>
            </div>
            <p>
              Reason: <span className="font-medium">{order.cancellation.reason.replace(/_/g, " ")}</span>
            </p>
            {order.cancellation.notes && (
              <p className="text-rose-600 dark:text-rose-400 italic">&ldquo;{order.cancellation.notes}&rdquo;</p>
            )}
            <p className="font-mono text-[10px] text-muted-foreground pt-1">
              Cancelled on {new Date(order.cancellation.cancelledAt).toLocaleString("en-IN")}
            </p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="pt-2 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Fulfillment Progression
          </h2>
          <div className="relative pl-6 sm:pl-8 border-l border-border/80 space-y-6 my-2">
            {order.timeline.map((step, idx) => {
              const dateDisplay = step.timestamp
                ? new Date(step.timestamp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div key={idx} className="relative group">
                  {/* Timeline bullet */}
                  <span
                    className={`absolute -left-[31px] sm:-left-[39px] top-0 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background ${
                      step.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs font-medium tracking-wide ${
                          step.current
                            ? "text-primary font-semibold"
                            : step.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.current && (
                        <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 h-4 border-primary text-primary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {step.description}
                    </p>
                    {dateDisplay && (
                      <p className="text-[10px] font-mono text-muted-foreground/80">
                        {dateDisplay}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Garments Items Section */}
      <div className="rounded-lg border border-border/80 bg-card p-6 md:p-8 space-y-4 shadow-sm">
        <h2 className="text-sm font-mono uppercase tracking-wider text-foreground">
          Bespoke Garments ({order.items.length})
        </h2>

        <div className="divide-y divide-border/60">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-16 rounded bg-neutral-100 dark:bg-neutral-800 shrink-0 overflow-hidden border border-border/40">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-muted-foreground m-auto absolute inset-0" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-serif font-medium text-foreground">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.brandName} • SKU: <span className="font-mono">{item.sku}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Size: <strong className="text-foreground">{item.size}</strong></span>
                    <span>•</span>
                    <span>Color: <strong className="text-foreground">{item.color}</strong></span>
                    <span>•</span>
                    <span>Qty: <strong className="text-foreground">{item.quantity}</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono">
                <span className="text-xs text-muted-foreground block">
                  {formatMoney(item.unitPriceMinor)} × {item.quantity}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(item.finalPriceMinor)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Pricing Breakdown & Delivery/Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pricing Summary Snapshot */}
        <div className="rounded-lg border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-mono uppercase tracking-wider text-foreground">
            Authoritative Pricing Breakdown
          </h2>

          <div className="space-y-2.5 font-mono text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground">{formatMoney(order.pricing.subtotalMinor)}</span>
            </div>

            {order.pricing.discountMinor > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Promotional Discount</span>
                <span>-{formatMoney(order.pricing.discountMinor)}</span>
              </div>
            )}

            {order.coupon && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Coupon ({order.coupon.code})
                </span>
                <span>-{formatMoney(order.coupon.discountMinor)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Atelier Delivery</span>
              <span className="text-foreground">
                {order.pricing.shippingMinor === 0 ? "Complimentary" : formatMoney(order.pricing.shippingMinor)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Goods & Services Tax (GST)</span>
              <span className="text-foreground">
                {order.pricing.taxMinor === 0 ? "Inclusive" : formatMoney(order.pricing.taxMinor)}
              </span>
            </div>

            <div className="border-t border-border/80 pt-3 flex justify-between text-sm font-bold text-foreground">
              <span>Grand Total</span>
              <span>{formatMoney(order.pricing.totalMinor)}</span>
            </div>
          </div>
        </div>

        {/* Destination & Payment Snapshots */}
        <div className="rounded-lg border border-border/80 bg-card p-6 space-y-6 shadow-sm">
          {/* Shipping Address Snapshot */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Delivery Destination</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-semibold text-foreground">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="font-mono pt-1 text-[11px]">Contact: {order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Payment Summary Snapshot */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-foreground">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Payment Details</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Method / Gateway:</span>
                <span className="text-foreground uppercase">{order.paymentSummary.provider}</span>
              </div>
              {order.paymentSummary.providerPaymentId && (
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="text-foreground">{order.paymentSummary.providerPaymentId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {order.paymentSummary.paymentStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span className="font-semibold text-foreground">
                  {formatMoney(order.paymentSummary.paidAmountMinor)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal Dialog */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="space-y-1.5">
              <h3 id="cancel-modal-title" className="font-serif text-lg font-medium text-foreground">
                Cancel Order {order.orderNumber}
              </h3>
              <p className="text-xs text-muted-foreground">
                Orders in <strong className="text-foreground">CONFIRMED</strong> status can be safely cancelled. Your shopping bag will remain intact.
              </p>
            </div>

            {cancelError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Cancellation Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value as OrderCancellationReason)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={OrderCancellationReason.CUSTOMER_CHANGED_MIND}>Changed my mind</option>
                  <option value={OrderCancellationReason.ORDERED_WRONG_SIZE}>Ordered wrong size / fitting</option>
                  <option value={OrderCancellationReason.ORDERED_WRONG_PRODUCT}>Selected wrong garment</option>
                  <option value={OrderCancellationReason.FOUND_BETTER_PRICE}>Found alternative selection</option>
                  <option value={OrderCancellationReason.DELIVERY_TIME_TOO_LONG}>Delivery timeline too long</option>
                  <option value={OrderCancellationReason.OTHER}>Other personal reason</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Optional details to assist our atelier concierge..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCancelling}
                  onClick={() => setIsCancelOpen(false)}
                  className="text-xs uppercase tracking-wider"
                >
                  Keep Order
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCancelling}
                  className="text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Return & Exchange Modal Dialog */}
      {order && (
        <OrderReturnExchangeModal
          order={order}
          isOpen={isReturnOpen}
          onClose={() => setIsReturnOpen(false)}
          onSuccess={(refNumber) => {
            setIsReturnOpen(false);
            router.push(`/account/returns/${refNumber}`);
          }}
        />
      )}
    </div>
  );
}
