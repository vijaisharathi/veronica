"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, Clock, AlertCircle, ShoppingBag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/money";
import { ROUTES } from "@/config/routes";
import { OrderDTO } from "@/modules/orders/types/order.types";
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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = React.useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  const fetchOrders = React.useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?page=${targetPage}&limit=10`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to load orders");
      }
      setOrders(json.data.items || []);
      setTotalPages(json.data.totalPages || 1);
      setTotalCount(json.data.total || 0);
      setPage(targetPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve orders";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.ACCOUNT}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Account
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
              Orders
            </span>
          </div>
          <h1 className="font-serif text-3xl font-light text-foreground">
            Order History
          </h1>
          <p className="text-xs text-muted-foreground">
            Review your bespoke atelier orders, fulfillment progression, and invoices.
          </p>
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {totalCount} {totalCount === 1 ? "Order" : "Orders"} Placed
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground tracking-wider uppercase font-mono">
            Loading your orders...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-start gap-3 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Unable to load orders</p>
            <p className="text-xs">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchOrders(page)}
              className="text-xs tracking-wider uppercase mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="py-12 border border-border/80 rounded-lg bg-surface/30">
          <EmptyState
            icon={<Package className="h-6 w-6 stroke-[1.5]" />}
            title="No Couture Orders Yet"
            description="You have not placed any orders yet. Discover our curated garments and artisanal creations."
            actionLabel="Explore Collections"
            actionHref={ROUTES.SHOP}
          />
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="rounded-lg border border-border/80 bg-card p-6 shadow-sm space-y-4 hover:border-primary/40 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold tracking-wider text-foreground">
                        {order.orderNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] tracking-wider uppercase ${getStatusBadgeClass(order.status)}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Placed on {dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:text-right">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                        Total
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono">
                        {formatMoney(order.pricing.totalMinor)}
                      </span>
                    </div>

                    <Link href={ROUTES.ACCOUNT_ORDER_DETAIL(order.orderNumber)}>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`View details for order ${order.orderNumber}`}
                        className="text-xs uppercase tracking-wider h-8"
                      >
                        <span>Details</span>
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Items Thumbnails & Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-surface/40 p-2.5 rounded border border-border/50"
                    >
                      <div className="relative h-14 w-12 rounded bg-neutral-100 dark:bg-neutral-800 shrink-0 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-muted-foreground m-auto absolute inset-0" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-medium text-foreground truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Size: {item.size} • Qty: {item.quantity}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {formatMoney(item.finalPriceMinor)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {order.items.length > 3 && (
                    <div className="flex items-center justify-center p-3 rounded border border-dashed border-border/70 text-xs text-muted-foreground font-mono">
                      +{order.items.length - 3} more {order.items.length - 3 === 1 ? "garment" : "garments"}
                    </div>
                  )}
                </div>

                {/* Delivery Destination Mini Footer */}
                <div className="pt-2 text-[11px] text-muted-foreground flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <p className="truncate">
                    Delivering to: <span className="text-foreground font-medium">{order.shippingAddress.fullName}</span>, {order.shippingAddress.city}, {order.shippingAddress.state} ({order.shippingAddress.pincode})
                  </p>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground shrink-0">
                    {itemCount} {itemCount === 1 ? "Item" : "Items"} Total
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs uppercase tracking-wider"
              >
                Previous
              </Button>
              <span className="text-xs font-mono text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs uppercase tracking-wider"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
