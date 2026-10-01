"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertCircle,
  XCircle,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ReturnStatus, ReturnType } from "@/constants/status";
import { ReturnCustomerDto } from "@/modules/returns/types/return.types";
import { formatMoney } from "@/lib/money";

const TIMELINE_STEPS: Array<{
  key: string;
  label: string;
  description: string;
  statuses: ReturnStatus[];
}> = [
  {
    key: "REQUESTED",
    label: "Return Requested",
    description: "Request submitted and logged for atelier review.",
    statuses: [
      ReturnStatus.REQUESTED,
      ReturnStatus.UNDER_REVIEW,
      ReturnStatus.APPROVED,
      ReturnStatus.PICKUP_SCHEDULED,
      ReturnStatus.PICKED_UP,
      ReturnStatus.IN_TRANSIT,
      ReturnStatus.RECEIVED,
      ReturnStatus.INSPECTION,
      ReturnStatus.INSPECTING,
      ReturnStatus.APPROVED_FOR_SETTLEMENT,
      ReturnStatus.APPROVED_FOR_REFUND,
      ReturnStatus.REFUND_INITIATED,
      ReturnStatus.COMPLETED,
    ],
  },
  {
    key: "APPROVED",
    label: "Approved for Return",
    description: "Reverse logistics authorization granted.",
    statuses: [
      ReturnStatus.APPROVED,
      ReturnStatus.PICKUP_SCHEDULED,
      ReturnStatus.PICKED_UP,
      ReturnStatus.IN_TRANSIT,
      ReturnStatus.RECEIVED,
      ReturnStatus.INSPECTION,
      ReturnStatus.INSPECTING,
      ReturnStatus.APPROVED_FOR_SETTLEMENT,
      ReturnStatus.APPROVED_FOR_REFUND,
      ReturnStatus.REFUND_INITIATED,
      ReturnStatus.COMPLETED,
    ],
  },
  {
    key: "PICKED_UP",
    label: "Picked Up / In Transit",
    description: "Courier has collected garments and package is en route.",
    statuses: [
      ReturnStatus.PICKED_UP,
      ReturnStatus.IN_TRANSIT,
      ReturnStatus.RECEIVED,
      ReturnStatus.INSPECTION,
      ReturnStatus.INSPECTING,
      ReturnStatus.APPROVED_FOR_SETTLEMENT,
      ReturnStatus.APPROVED_FOR_REFUND,
      ReturnStatus.REFUND_INITIATED,
      ReturnStatus.COMPLETED,
    ],
  },
  {
    key: "RECEIVED",
    label: "Received at Warehouse",
    description: "Package received at our quality inspection facility.",
    statuses: [
      ReturnStatus.RECEIVED,
      ReturnStatus.INSPECTION,
      ReturnStatus.INSPECTING,
      ReturnStatus.APPROVED_FOR_SETTLEMENT,
      ReturnStatus.APPROVED_FOR_REFUND,
      ReturnStatus.REFUND_INITIATED,
      ReturnStatus.COMPLETED,
    ],
  },
  {
    key: "SETTLEMENT",
    label: "Inspection & Settlement Ready",
    description: "Garments passed quality check and queued for Phase 23 refund settlement.",
    statuses: [
      ReturnStatus.APPROVED_FOR_SETTLEMENT,
      ReturnStatus.APPROVED_FOR_REFUND,
      ReturnStatus.REFUND_INITIATED,
      ReturnStatus.COMPLETED,
    ],
  },
];

export default function CustomerReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const returnNumber = (params?.returnNumber as string) || "";

  const [returnReq, setReturnReq] = React.useState<ReturnCustomerDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cancellation state
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  const fetchDetail = React.useCallback(async () => {
    if (!returnNumber) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/returns/${returnNumber}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Return request not found");
      }
      setReturnReq(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to retrieve return details");
    } finally {
      setLoading(false);
    }
  }, [returnNumber]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReq) return;
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/account/returns/${returnReq.returnNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to cancel return");
      }
      setReturnReq(json.data);
      setIsCancelOpen(false);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  const isCancellable =
    returnReq &&
    ([ReturnStatus.REQUESTED, ReturnStatus.UNDER_REVIEW, ReturnStatus.APPROVED] as ReturnStatus[]).includes(
      returnReq.status
    );

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-20 px-4 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="h-6 w-6 text-primary" />
        <p className="text-xs font-mono">Loading return progress timeline...</p>
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-4">
        <Link
          href="/account/returns"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Returns
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <p className="font-semibold text-sm">Return Not Found</p>
          <p className="mt-1">{error || "Unable to display return details."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/account/returns"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Returns
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-2xl font-bold text-foreground">
                {returnReq.returnNumber}
              </h1>
              <Badge variant="outline" className="text-xs font-mono">
                {returnReq.type === ReturnType.EXCHANGE ? "SIZE EXCHANGE" : "RETURN"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Initiated on {new Date(returnReq.createdAt).toLocaleString()}
              {returnReq.orderNumber && (
                <span>
                  {" "}• Original Order:{" "}
                  <Link
                    href={`/account/orders/${returnReq.orderNumber}`}
                    className="text-primary hover:underline font-mono"
                  >
                    {returnReq.orderNumber}
                  </Link>
                </span>
              )}
            </p>
          </div>

          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelOpen(true)}
              className="text-xs uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
            >
              Cancel Return
            </Button>
          )}
        </div>
      </div>

      {/* Visual Status Progression Timeline */}
      <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Reverse Logistics Progression
        </h2>

        <div className="relative pl-6 md:pl-8 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = step.statuses.includes(returnReq.status);
            const isCurrent =
              (idx === 0 && returnReq.status === ReturnStatus.REQUESTED) ||
              (idx === 1 && returnReq.status === ReturnStatus.APPROVED) ||
              (idx === 2 && ([ReturnStatus.PICKED_UP, ReturnStatus.IN_TRANSIT] as ReturnStatus[]).includes(returnReq.status)) ||
              (idx === 3 && ([ReturnStatus.RECEIVED, ReturnStatus.INSPECTION] as ReturnStatus[]).includes(returnReq.status)) ||
              (idx === 4 &&
                ([ReturnStatus.APPROVED_FOR_SETTLEMENT, ReturnStatus.COMPLETED] as ReturnStatus[]).includes(returnReq.status));

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                <div
                  className={`absolute -left-[29px] md:-left-[37px] top-0.5 h-6 w-6 rounded-full border flex items-center justify-center transition ${
                    isCompleted
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px] font-mono">{idx + 1}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <p
                    className={`text-sm font-serif font-medium ${
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Returned Garments List */}
      <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 space-y-4 shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Garments Scheduled for Reverse Pickup ({returnReq.items.length})
        </h2>

        <div className="divide-y divide-border/60">
          {returnReq.items.map((item, idx) => (
            <div
              key={idx}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-12 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-border/40">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-serif font-medium text-foreground">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    SKU: {item.sku} • Qty: <strong className="text-foreground">{item.quantity}</strong>
                    {item.size ? ` • Size: ${item.size}` : ""} {item.color ? ` • Color: ${item.color}` : ""}
                  </p>
                  <p className="text-[11px] text-primary/90 font-mono">
                    Reason: {item.reason.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono">
                <span className="text-xs text-muted-foreground block">
                  {formatMoney(item.unitPriceMinor)} × {item.quantity}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(item.unitPriceMinor * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Pickup Snapshot & Carrier Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pickup Address Snapshot */}
        <div className="rounded-xl border border-border/80 bg-card p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Pickup Address Snapshot</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground">
              {returnReq.pickupAddressSnapshot.fullName}
            </p>
            <p>{returnReq.pickupAddressSnapshot.addressLine1}</p>
            {returnReq.pickupAddressSnapshot.addressLine2 && (
              <p>{returnReq.pickupAddressSnapshot.addressLine2}</p>
            )}
            <p>
              {returnReq.pickupAddressSnapshot.city}, {returnReq.pickupAddressSnapshot.state} —{" "}
              {returnReq.pickupAddressSnapshot.pincode}
            </p>
            <p className="font-mono pt-1 text-[11px]">
              Phone: {returnReq.pickupAddressSnapshot.phone}
            </p>
          </div>
        </div>

        {/* Carrier Tracking */}
        <div className="rounded-xl border border-border/80 bg-card p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Truck className="h-3.5 w-3.5 text-primary" />
            <span>Carrier Reverse Logistics</span>
          </div>

          {returnReq.tracking ? (
            <div className="text-xs font-mono space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Carrier:</span>
                <span className="text-foreground uppercase">{returnReq.tracking.provider}</span>
              </div>
              {returnReq.tracking.trackingNumber && (
                <div className="flex justify-between">
                  <span>AWB Tracking:</span>
                  <span className="text-foreground font-bold">{returnReq.tracking.trackingNumber}</span>
                </div>
              )}
              {returnReq.tracking.scheduledPickupDate && (
                <div className="flex justify-between">
                  <span>Scheduled Pickup:</span>
                  <span className="text-foreground">
                    {new Date(returnReq.tracking.scheduledPickupDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {returnReq.tracking.actualPickupDate && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Picked Up:</span>
                  <span>{new Date(returnReq.tracking.actualPickupDate).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/60">
                <span>Shipment Status:</span>
                <span className="text-foreground uppercase font-semibold">
                  {returnReq.tracking.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Reverse pickup booking details will be populated once your return is approved and assigned to an atelier courier.
            </p>
          )}
        </div>
      </div>

      {/* Customer Cancellation Dialog */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-return-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h3 id="cancel-return-title" className="font-serif text-lg font-medium text-foreground">
                Cancel Return {returnReq.returnNumber}
              </h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you wish to cancel this return? The garments will remain in your ownership.
              </p>
            </div>

            {cancelError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Cancellation Note (Optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  rows={2}
                  maxLength={300}
                  className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cancelling}
                  onClick={() => setIsCancelOpen(false)}
                  className="text-xs uppercase tracking-wider"
                >
                  Keep Return Active
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cancelling}
                  className="text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
