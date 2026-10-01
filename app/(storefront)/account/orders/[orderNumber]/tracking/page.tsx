"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Package as PackageIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { OrderTrackingDTO } from "@/modules/fulfillment/types/fulfillment.types";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = (params?.orderNumber as string) || "";

  const [tracking, setTracking] = React.useState<OrderTrackingDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTracking = React.useCallback(async () => {
    if (!orderNumber) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/tracking`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Tracking details unavailable");
      }
      setTracking(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load shipment tracking";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  React.useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <Spinner className="h-8 w-8 mx-auto text-primary" />
        <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
          Querying Dispatch Operations...
        </p>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-xl font-serif font-bold text-foreground">Tracking Information Unavailable</h1>
        <p className="text-sm text-muted-foreground">{error || "No tracking found for this order"}</p>
        <div className="pt-4 flex justify-center gap-4">
          <Link
            href={`/account/orders/${orderNumber}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Order
          </Link>
          <Button onClick={fetchTracking}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <Link
            href={`/account/orders/${orderNumber}`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Order {orderNumber}
          </Link>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
            <span>Live Dispatch Tracking</span>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              {tracking.orderStatus}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Order Reference: {tracking.orderNumber}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTracking} className="self-start sm:self-auto">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh Status
        </Button>
      </div>

      {/* Shipments List */}
      {tracking.shipments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-medium text-foreground">Shipment Preparation in Progress</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your bespoke garments are being inspected, packed, and prepared for carrier dispatch at our atelier.
            Air Waybill (AWB) details will appear here as soon as the carrier registers the parcel.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {tracking.shipments.map((shipment, sIdx) => (
            <div
              key={shipment.shipmentNumber}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-6 p-6"
            >
              {/* Shipment Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">
                      Package {sIdx + 1} of {tracking.shipments.length}: {shipment.shipmentNumber}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {shipment.provider}
                    </Badge>
                  </div>
                  {shipment.awbNumber && (
                    <p className="text-xs font-mono text-muted-foreground">
                      AWB / Tracking Number:{" "}
                      <span className="text-foreground font-bold">{shipment.awbNumber}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    {shipment.statusLabel}
                  </Badge>
                  {shipment.trackingUrl && (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <span className="mr-1.5">Carrier Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Estimated / Delivery Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Estimated Delivery</span>
                  <span className="text-foreground font-semibold">
                    {shipment.estimatedDeliveryDate
                      ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "Pending Carrier Confirmation"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Dispatched At</span>
                  <span className="text-foreground font-semibold">
                    {shipment.shippedAt
                      ? new Date(shipment.shippedAt).toLocaleString()
                      : "Awaiting Dispatch"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Delivered At</span>
                  <span className="text-foreground font-semibold">
                    {shipment.deliveredAt
                      ? new Date(shipment.deliveredAt).toLocaleString()
                      : "In Progress"}
                  </span>
                </div>
              </div>

              {/* Timeline Stepper */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Shipment Checkpoints
                </h3>

                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {shipment.timeline.map((step, tIdx) => (
                    <div key={tIdx} className="relative group">
                      <span
                        className={`absolute -left-[31px] sm:-left-[39px] top-0 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background ${
                          step.isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.isCompleted ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-medium tracking-wide ${
                              step.isCurrent
                                ? "text-primary font-bold"
                                : step.isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.isCurrent && (
                            <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 h-4 border-primary text-primary">
                              Current Status
                            </Badge>
                          )}
                        </div>

                        {step.description && (
                          <p className="text-[11px] text-muted-foreground">{step.description}</p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/80 pt-0.5">
                          {step.timestamp && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(step.timestamp).toLocaleString()}
                            </span>
                          )}
                          {step.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {step.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items in this shipment */}
              <div className="space-y-3 pt-4 border-t border-border/60">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <PackageIcon className="h-3.5 w-3.5" />
                  <span>Items in This Consignment ({shipment.items.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {shipment.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.color} • {item.size} • SKU: {item.sku}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
