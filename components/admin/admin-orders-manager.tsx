"use client";

import * as React from "react";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/money";
import { OrderDTO, PaymentOrderReconciliationMismatch } from "@/modules/orders/types/order.types";
import { OrderStatus } from "@/constants/status";
import { VALID_ORDER_TRANSITIONS } from "@/modules/orders/state-machine/order-state-machine";

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

export function AdminOrdersManager() {
  const [orders, setOrders] = React.useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Transition Dialog State
  const [transitionOrder, setTransitionOrder] = React.useState<OrderDTO | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<OrderStatus | null>(null);
  const [transitionReason, setTransitionReason] = React.useState("");
  const [isSubmittingTransition, setIsSubmittingTransition] = React.useState(false);
  const [transitionError, setTransitionError] = React.useState<string | null>(null);

  // Detail Modal State
  const [inspectOrder, setInspectOrder] = React.useState<OrderDTO | null>(null);

  // Reconciliation Scan State
  const [isScanning, setIsScanning] = React.useState(false);
  const [reconReport, setReconReport] = React.useState<{
    scannedAt: string;
    discrepanciesCount: number;
    discrepancies: PaymentOrderReconciliationMismatch[];
  } | null>(null);
  const [isReconOpen, setIsReconOpen] = React.useState(false);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "10");
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }

    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to load orders");
      }

      setOrders(json.data.items || []);
      setTotalPages(json.data.totalPages || 1);
      setTotalCount(json.data.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenTransition = (order: OrderDTO, toStatus: OrderStatus) => {
    setTransitionOrder(order);
    setTargetStatus(toStatus);
    setTransitionReason("");
    setTransitionError(null);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionOrder || !targetStatus) return;

    setIsSubmittingTransition(true);
    setTransitionError(null);

    try {
      const res = await fetch(`/api/admin/orders/${transitionOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          reason: transitionReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Status transition rejected");
      }

      // Update in local state
      setOrders((prev) =>
        prev.map((o) => (o.id === transitionOrder.id ? json.data : o))
      );

      if (inspectOrder?.id === transitionOrder.id) {
        setInspectOrder(json.data);
      }

      setTransitionOrder(null);
      setTargetStatus(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transition failed";
      setTransitionError(msg);
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  const handleRunReconciliation = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/admin/orders/reconciliation");
      const json = await res.json();
      if (res.ok && json.success) {
        setReconReport(json.data);
        setIsReconOpen(true);
      }
    } catch (err) {
      console.error("Reconciliation scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/80 gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-light text-foreground">
            Order Lifecycle Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Fulfillment operations, state machine transitions, and payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunReconciliation}
            disabled={isScanning}
            className="text-xs font-mono uppercase tracking-wider h-8"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
            {isScanning ? "Scanning..." : "Reconcile"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadOrders}
            disabled={isLoading}
            className="text-xs uppercase tracking-wider h-8"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border/80">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, email, or phone..."
            className="w-full rounded border border-border bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {["ALL", OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED].map(
            (status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded text-[11px] font-mono uppercase transition-colors shrink-0 ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-surface/60 text-muted-foreground hover:text-foreground hover:bg-surface border border-border/60"
                }`}
              >
                {status.replace(/_/g, " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to fetch orders</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Loading orders...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No matching orders found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No customer orders matched your search or status filter. Try clearing filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/50 border-b border-border/80 font-mono uppercase text-[10px] text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => {
                  const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status] || [];
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-surface/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground truncate max-w-[180px]">
                          {order.shippingAddress.fullName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">
                          {order.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {itemCount} {itemCount === 1 ? "garment" : "garments"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                        {formatMoney(order.pricing.totalMinor)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] tracking-wider uppercase ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Next Legal Transitions */}
                          {allowedTransitions.slice(0, 2).map((nextStatus) => (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenTransition(order, nextStatus)}
                              className="text-[10px] uppercase font-mono tracking-wider h-7 px-2"
                            >
                              → {nextStatus.replace(/_/g, " ")}
                            </Button>
                          ))}

                          {/* Inspect Modal Trigger */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectOrder(order)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="sr-only">Inspect Order {order.orderNumber}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {orders.length} of {totalCount} orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs uppercase h-7"
              >
                Previous
              </Button>
              <span className="font-mono text-xs px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs uppercase h-7"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transition Confirmation Modal */}
      {transitionOrder && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Transition Order Status
              </h3>
              <p className="text-xs text-muted-foreground">
                Advancing <strong className="font-mono text-foreground">{transitionOrder.orderNumber}</strong> from{" "}
                <Badge variant="outline" className="text-[10px] mx-1">
                  {transitionOrder.status}
                </Badge>{" "}
                to{" "}
                <Badge variant="outline" className="text-[10px] mx-1 bg-primary text-primary-foreground border-primary">
                  {targetStatus}
                </Badge>
              </p>
            </div>

            {transitionError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {transitionError}
              </div>
            )}

            <form onSubmit={handleExecuteTransition} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Transition Reason / Operational Notes
                </label>
                <textarea
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="e.g., Atelier tailoring inspection approved, passed to packaging..."
                  rows={3}
                  className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingTransition}
                  onClick={() => {
                    setTransitionOrder(null);
                    setTargetStatus(null);
                  }}
                  className="text-xs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingTransition}
                  className="text-xs uppercase tracking-wider"
                >
                  {isSubmittingTransition ? "Transitioning..." : "Confirm Transition"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Order Modal */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl space-y-6 my-8"
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
                  Order Inspector
                </span>
                <h3 className="font-mono text-xl font-bold text-foreground">
                  {inspectOrder.orderNumber}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectOrder(null)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            {/* Order Items Snapshot */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Purchased Garments ({inspectOrder.items.length})
              </h4>
              <div className="divide-y divide-border/60 border border-border/60 rounded-md p-3 bg-surface/30">
                {inspectOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        SKU: {item.sku} • Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {formatMoney(item.finalPriceMinor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Address Snapshots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="border border-border/60 rounded-md p-3.5 bg-surface/30 space-y-2">
                <span className="text-muted-foreground uppercase text-[10px] block">
                  Financial Snapshot
                </span>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatMoney(inspectOrder.pricing.subtotalMinor)}</span>
                </div>
                {inspectOrder.pricing.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatMoney(inspectOrder.pricing.discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-1 font-bold text-foreground">
                  <span>Grand Total:</span>
                  <span>{formatMoney(inspectOrder.pricing.totalMinor)}</span>
                </div>
              </div>

              <div className="border border-border/60 rounded-md p-3.5 bg-surface/30 space-y-1 font-sans text-xs">
                <span className="text-muted-foreground uppercase font-mono text-[10px] block mb-1">
                  Delivery Destination
                </span>
                <p className="font-medium text-foreground">{inspectOrder.shippingAddress.fullName}</p>
                <p className="text-muted-foreground text-[11px]">
                  {inspectOrder.shippingAddress.addressLine1},{" "}
                  {inspectOrder.shippingAddress.city}, {inspectOrder.shippingAddress.state} — {inspectOrder.shippingAddress.pincode}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground pt-1">
                  Phone: {inspectOrder.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* Audit Status History */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Audit Status Timeline
              </h4>
              <div className="border border-border/60 rounded-md p-4 bg-surface/30 space-y-3 text-xs">
                {inspectOrder.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          step.completed ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className={step.completed ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {step.label}
                      </span>
                    </div>
                    {step.timestamp && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(step.timestamp).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectOrder(null)}
                className="text-xs uppercase tracking-wider"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Report Modal */}
      {isReconOpen && reconReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="font-serif text-lg font-medium text-foreground">
                  Payment / Order Reconciliation Scan
                </h3>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Scanned on {new Date(reconReport.scannedAt).toLocaleString("en-IN")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReconOpen(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            {reconReport.discrepanciesCount === 0 ? (
              <div className="p-6 text-center space-y-2 border border-emerald-200 bg-emerald-50 rounded dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs">
                  Zero Reconciliation Discrepancies
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Every captured payment corresponds to a verified order and all monetary sums match 100%.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 border border-amber-300 bg-amber-50 rounded text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Detected {reconReport.discrepanciesCount} payment-order {reconReport.discrepanciesCount === 1 ? "mismatch" : "mismatches"}.
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {reconReport.discrepancies.map((d, i) => (
                    <div key={i} className="p-3 border border-border rounded bg-surface text-xs space-y-1">
                      <p className="font-mono font-semibold text-foreground text-[11px]">{d.type}</p>
                      <p className="text-muted-foreground text-[11px]">{d.description}</p>
                      <p className="font-mono text-[10px] text-primary">Payment ID: {d.paymentId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReconOpen(false)}
                className="text-xs uppercase tracking-wider"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
