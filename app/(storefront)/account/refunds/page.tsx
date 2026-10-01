"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { RefundStatus } from "@/constants/status";
import { CustomerRefundDTO } from "@/modules/refunds/types/refund.types";
import { formatMoney } from "@/lib/money";

export default function CustomerRefundsPage() {
  const [refunds, setRefunds] = useState<CustomerRefundDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PROCESSING" | "COMPLETED" | "FAILED">("ALL");

  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/account/refunds?limit=50");
      if (!res.ok) {
        throw new Error("Unable to fetch your refund history");
      }
      const data = await res.json();
      setRefunds(data.data?.refunds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const filteredRefunds = React.useMemo(() => {
    let list = refunds;

    if (activeTab === "PROCESSING") {
      list = list.filter((r) =>
        ([
          RefundStatus.REQUESTED,
          RefundStatus.ELIGIBLE,
          RefundStatus.INITIATED,
          RefundStatus.PROCESSING,
          RefundStatus.RECONCILIATION_REQUIRED,
        ] as RefundStatus[]).includes(r.status)
      );
    } else if (activeTab === "COMPLETED") {
      list = list.filter((r) => r.status === RefundStatus.COMPLETED);
    } else if (activeTab === "FAILED") {
      list = list.filter((r) => r.status === RefundStatus.FAILED);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.refundNumber.toLowerCase().includes(q) ||
          r.orderNumber.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return list;
  }, [refunds, activeTab, search]);

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.COMPLETED:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1 font-mono text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            COMPLETED
          </Badge>
        );
      case RefundStatus.FAILED:
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400 gap-1 font-mono text-[10px]">
            <AlertCircle className="h-3 w-3" />
            FAILED
          </Badge>
        );
      case RefundStatus.PROCESSING:
      case RefundStatus.INITIATED:
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 gap-1 font-mono text-[10px]">
            <Clock className="h-3 w-3" />
            PROCESSING
          </Badge>
        );
      case RefundStatus.RECONCILIATION_REQUIRED:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400 gap-1 font-mono text-[10px]">
            <HelpCircle className="h-3 w-3" />
            PENDING RECONCILIATION
          </Badge>
        );
      case RefundStatus.REQUESTED:
      case RefundStatus.ELIGIBLE:
      default:
        return (
          <Badge className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 gap-1 font-mono text-[10px]">
            <Clock className="h-3 w-3" />
            REQUESTED
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary">Atelier Concierge</span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              FINANCIAL SETTLEMENTS
            </Badge>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground mt-1">
            Refunds & Credits
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track authorized settlements, return credits, and payment gateway reversals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/account/returns">
            <Button variant="outline" size="sm" className="text-xs font-mono gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Returns & Exchanges
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button variant="outline" size="sm" className="text-xs font-mono gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/60 w-full sm:w-auto">
          {(["ALL", "PROCESSING", "COMPLETED", "FAILED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search refund or order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border/80 rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner className="h-6 w-6 text-primary" />
          <p className="text-xs font-mono">Loading refund history...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <p className="font-semibold text-sm">Failed to load refunds</p>
          <p className="mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRefunds} className="mt-4 text-xs font-mono">
            Retry
          </Button>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold text-foreground">No Refunds Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || activeTab !== "ALL"
                ? "No refunds match your active filters or search terms."
                : "You do not have any processed or requested refunds for your account."}
            </p>
          </div>
          {(search || activeTab !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveTab("ALL");
              }}
              className="text-xs font-mono"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRefunds.map((refund) => (
            <Link
              key={refund.refundNumber}
              href={`/account/refunds/${refund.refundNumber}`}
              className="group block rounded-xl border border-border/80 bg-card p-5 hover:border-primary/50 transition shadow-sm hover:shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition">
                      {refund.refundNumber}
                    </span>
                    {getStatusBadge(refund.status)}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                      {refund.type.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Order:{" "}
                      <span className="font-mono text-foreground font-medium">
                        {refund.orderNumber}
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      Initiated: {new Date(refund.initiatedAt).toLocaleDateString()}
                    </span>
                    {refund.completedAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Completed: {new Date(refund.completedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground/90 line-clamp-1 italic">
                    Reason: {refund.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Settlement Amount
                    </p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {formatMoney(refund.amountMinor, refund.currency)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
