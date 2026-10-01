"use client";

import * as React from "react";
import Link from "next/link";
import {
  RotateCcw,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowRight,
  Package,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReturnStatus, ReturnType } from "@/constants/status";
import { ReturnCustomerDto } from "@/modules/returns/types/return.types";
import { formatMoney } from "@/lib/money";

function getStatusBadge(status: ReturnStatus) {
  switch (status) {
    case ReturnStatus.REQUESTED:
    case ReturnStatus.UNDER_REVIEW:
      return (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-mono">
          <Clock className="h-3 w-3 mr-1" />
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case ReturnStatus.APPROVED:
    case ReturnStatus.PICKUP_SCHEDULED:
    case ReturnStatus.PICKED_UP:
    case ReturnStatus.IN_TRANSIT:
      return (
        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-mono">
          <Truck className="h-3 w-3 mr-1" />
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case ReturnStatus.RECEIVED:
    case ReturnStatus.INSPECTION:
    case ReturnStatus.INSPECTING:
      return (
        <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] font-mono">
          <Package className="h-3 w-3 mr-1" />
          INSPECTION
        </Badge>
      );
    case ReturnStatus.APPROVED_FOR_SETTLEMENT:
    case ReturnStatus.APPROVED_FOR_REFUND:
    case ReturnStatus.REFUND_INITIATED:
    case ReturnStatus.COMPLETED:
      return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-mono">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case ReturnStatus.REJECTED:
    case ReturnStatus.CANCELLED:
      return (
        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-mono">
          <XCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] font-mono">
          {status}
        </Badge>
      );
  }
}

export default function CustomerReturnsDashboardPage() {
  const [returns, setReturns] = React.useState<ReturnCustomerDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED">("ALL");

  const fetchReturns = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/returns?limit=50");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to load returns");
      }
      setReturns(json.data.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load return requests");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const filteredReturns = React.useMemo(() => {
    if (activeTab === "ALL") return returns;
    if (activeTab === "ACTIVE") {
      return returns.filter(
        (r) =>
          !([ReturnStatus.COMPLETED, ReturnStatus.REJECTED, ReturnStatus.CANCELLED] as ReturnStatus[]).includes(r.status)
      );
    }
    if (activeTab === "COMPLETED") {
      return returns.filter((r) =>
        ([
          ReturnStatus.COMPLETED,
          ReturnStatus.APPROVED_FOR_SETTLEMENT,
          ReturnStatus.APPROVED_FOR_REFUND,
          ReturnStatus.REFUND_INITIATED,
        ] as ReturnStatus[]).includes(r.status)
      );
    }
    if (activeTab === "CANCELLED") {
      return returns.filter((r) =>
        ([ReturnStatus.CANCELLED, ReturnStatus.REJECTED] as ReturnStatus[]).includes(r.status)
      );
    }
    return returns;
  }, [returns, activeTab]);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary">Atelier Concierge</span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              Phase 22
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground mt-1">
            Returns & Exchanges
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your reverse logistics pickups, quality inspection, and replacement orders.
          </p>
        </div>

        <Link href="/account/orders">
          <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
            View Delivered Orders
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 text-xs font-mono uppercase tracking-wider">
        {(["ALL", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition relative ${
              activeTab === tab
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner className="h-6 w-6 text-primary" />
          <p className="text-xs font-mono">Retrieving your returns archive...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredReturns.length === 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-muted-foreground">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg text-foreground">No return requests found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You do not have any {activeTab !== "ALL" ? activeTab.toLowerCase() : ""} return or exchange requests at this time.
            </p>
          </div>
          <Link href="/account/orders" className="inline-block pt-2">
            <Button size="sm" className="text-xs uppercase tracking-wider bg-primary text-primary-foreground">
              Browse Delivered Orders
            </Button>
          </Link>
        </div>
      )}

      {!loading && !error && filteredReturns.length > 0 && (
        <div className="space-y-4">
          {filteredReturns.map((ret) => (
            <div
              key={ret.id}
              className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:border-border transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {ret.returnNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {ret.type === ReturnType.EXCHANGE ? "SIZE EXCHANGE" : "RETURN"}
                  </Badge>
                  {getStatusBadge(ret.status)}
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  Requested on {new Date(ret.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ret.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-border/40 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/30"
                  >
                    <div className="h-10 w-10 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-xs font-serif font-medium text-foreground truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        Qty: {item.quantity} • {item.size ? `Size ${item.size}` : ""} {item.color ? `• ${item.color}` : ""}
                      </p>
                      <p className="text-[10px] text-primary/80 font-mono">
                        Reason: {item.reason.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer / Tracking Info & Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                <div className="text-muted-foreground">
                  {ret.orderNumber && (
                    <span>
                      Original Order: <strong className="text-foreground font-mono">{ret.orderNumber}</strong>
                    </span>
                  )}
                  {ret.tracking?.trackingNumber && (
                    <span className="ml-3 font-mono">
                      Tracking: {ret.tracking.trackingNumber} ({ret.tracking.provider})
                    </span>
                  )}
                </div>

                <Link href={`/account/returns/${ret.returnNumber}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <span>View Status Timeline</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
