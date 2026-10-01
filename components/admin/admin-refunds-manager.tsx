"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  CreditCard,
  PlusCircle,
  X,
  Receipt,
} from "lucide-react";
import { RefundStatus } from "@/constants/status";
import { AdminRefundDTO } from "@/modules/refunds/types/refund.types";
import { formatMoney } from "@/lib/money";

export function AdminRefundsManager() {
  const [refunds, setRefunds] = React.useState<AdminRefundDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [statusCounts, setStatusCounts] = React.useState<Record<string, number>>({});

  // Filters & Pagination
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 20;

  // Modals
  const [selectedRefund, setSelectedRefund] = React.useState<AdminRefundDTO | null>(null);
  const [manualRefundOpen, setManualRefundOpen] = React.useState(false);
  const [manualOrderId, setManualOrderId] = React.useState("");
  const [manualAmountRupees, setManualAmountRupees] = React.useState("");
  const [manualReason, setManualReason] = React.useState("");
  const [manualRefundShipping, setManualRefundShipping] = React.useState(false);
  const [manualSubmitting, setManualSubmitting] = React.useState(false);

  // Operational Action State
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const fetchRefunds = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/refunds?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch admin refunds");

      const data = await res.json();
      setRefunds(data.data?.refunds || []);
      setTotal(data.data?.total || 0);
      if (data.data?.statusCounts) {
        setStatusCounts(data.data.statusCounts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading refunds");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  React.useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleReconcile = async (refundId: string) => {
    try {
      setActionInProgress(refundId);
      setError(null);
      const res = await fetch(`/api/admin/refunds/${refundId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Reconciliation failed");
      }

      setSuccessMessage("Refund successfully reconciled against payment gateway");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRefunds();
      if (selectedRefund && selectedRefund.id === refundId) {
        const updated = await fetch(`/api/admin/refunds/${refundId}`).then((r) => r.json());
        if (updated.data) setSelectedRefund(updated.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetry = async (refundId: string) => {
    try {
      setActionInProgress(refundId);
      setError(null);
      const res = await fetch(`/api/admin/refunds/${refundId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin retry from operational dashboard" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Retry failed");
      }

      setSuccessMessage("Refund retry dispatched to gateway");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRefunds();
      if (selectedRefund && selectedRefund.id === refundId) {
        const updated = await fetch(`/api/admin/refunds/${refundId}`).then((r) => r.json());
        if (updated.data) setSelectedRefund(updated.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleManualRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setManualSubmitting(true);
      setError(null);

      const parsedRupees = parseFloat(manualAmountRupees);
      if (isNaN(parsedRupees) || parsedRupees <= 0) {
        throw new Error("Please enter a valid refund amount in ₹");
      }

      const amountMinor = Math.round(parsedRupees * 100);

      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: manualOrderId.trim(),
          amountMinor,
          reason: manualReason.trim(),
          refundShipping: manualRefundShipping,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to create manual refund");
      }

      setSuccessMessage("Manual refund successfully authorized and dispatched");
      setTimeout(() => setSuccessMessage(null), 4000);
      setManualRefundOpen(false);
      setManualOrderId("");
      setManualAmountRupees("");
      setManualReason("");
      setManualRefundShipping(false);
      await fetchRefunds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual refund failed");
    } finally {
      setManualSubmitting(false);
    }
  };

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            COMPLETED
          </span>
        );
      case RefundStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case RefundStatus.PROCESSING:
      case RefundStatus.INITIATED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            {status}
          </span>
        );
      case RefundStatus.RECONCILIATION_REQUIRED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400">
            <HelpCircle className="h-3 w-3" />
            RECONCILIATION REQ
          </span>
        );
      case RefundStatus.RETRY_PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20 dark:bg-purple-950/40 dark:text-purple-400">
            <RefreshCw className="h-3 w-3" />
            RETRY PENDING
          </span>
        );
      case RefundStatus.REQUESTED:
      case RefundStatus.ELIGIBLE:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-500/10 text-zinc-600 border border-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400">
            <Clock className="h-3 w-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Refund Operations & Reconciliations
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative financial settlement layer, gateway reversals, and reconciliation control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRefunds()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-border/80 rounded-lg hover:bg-muted transition text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setManualRefundOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Issue Manual Refund
          </button>
        </div>
      </div>

      {/* Operational Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Total Settlements
          </p>
          <p className="text-2xl font-mono font-bold text-foreground">{total}</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Processing / In Flight
          </p>
          <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {(statusCounts[RefundStatus.PROCESSING] || 0) + (statusCounts[RefundStatus.INITIATED] || 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Completed
          </p>
          <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {statusCounts[RefundStatus.COMPLETED] || 0}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Needs Reconciliation
          </p>
          <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {statusCounts[RefundStatus.RECONCILIATION_REQUIRED] || 0}
          </p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {(
            [
              { key: "ALL", label: "All Refunds" },
              { key: RefundStatus.PROCESSING, label: "Processing" },
              { key: RefundStatus.COMPLETED, label: "Completed" },
              { key: RefundStatus.RECONCILIATION_REQUIRED, label: "Reconciliation" },
              { key: RefundStatus.FAILED, label: "Failed" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition whitespace-nowrap ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search REF#, ORD#, gateway ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border/80 rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Refunds Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 font-mono uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Refund Ref</th>
                <th className="py-3 px-4">Order / Customer</th>
                <th className="py-3 px-4">Type & Source</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Gateway Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Querying refund repository...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono">
                    No refunds found matching specified criteria.
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-muted/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {refund.refundNumber}
                      <p className="text-[10px] text-muted-foreground font-normal">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-mono text-foreground font-medium">
                        {refund.orderNumber || "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                        {refund.customerName || refund.customerEmail || "Guest"}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                        {refund.type.replace("_", " ")}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate max-w-[160px]">
                        {refund.reason}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {formatMoney(refund.amountMinor, refund.currency)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(refund.status)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {refund.providerRefundId ? (
                        <span className="text-foreground">{refund.providerRefundId}</span>
                      ) : (
                        <span className="italic text-muted-foreground/60">Not assigned</span>
                      )}
                      <p className="text-[10px] text-muted-foreground/70">{refund.provider}</p>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="px-2.5 py-1 text-[11px] font-mono rounded bg-muted/60 hover:bg-muted text-foreground transition"
                      >
                        Inspect
                      </button>

                      {refund.providerRefundId && (
                        <button
                          onClick={() => handleReconcile(refund.id)}
                          disabled={actionInProgress === refund.id}
                          className="px-2.5 py-1 text-[11px] font-mono rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition disabled:opacity-50"
                        >
                          {actionInProgress === refund.id ? "Syncing..." : "Reconcile"}
                        </button>
                      )}

                      {refund.status === RefundStatus.FAILED && (
                        <button
                          onClick={() => handleRetry(refund.id)}
                          disabled={actionInProgress === refund.id}
                          className="px-2.5 py-1 text-[11px] font-mono rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 transition disabled:opacity-50"
                        >
                          {actionInProgress === refund.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/60 text-xs font-mono">
          <p className="text-muted-foreground">
            Showing {refunds.length} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 border border-border/80 rounded bg-card hover:bg-muted disabled:opacity-40 transition"
            >
              Prev
            </button>
            <span className="text-muted-foreground px-1">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-2.5 py-1 border border-border/80 rounded bg-card hover:bg-muted disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Refund Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xl font-bold text-foreground">
                    {selectedRefund.refundNumber}
                  </h3>
                  {getStatusBadge(selectedRefund.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order: <span className="font-mono text-foreground">{selectedRefund.orderNumber}</span> • Customer: {selectedRefund.customerName || selectedRefund.customerEmail || "Guest"}
                </p>
              </div>

              <button
                onClick={() => setSelectedRefund(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Financial Snapshot */}
            {selectedRefund.calculationSnapshot && (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Financial Calculation Snapshot
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Original Paid</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(selectedRefund.calculationSnapshot.paidAmount, selectedRefund.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Previously Refunded</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(selectedRefund.calculationSnapshot.previouslyRefundedAmount, selectedRefund.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Refundable Balance Prior</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(selectedRefund.calculationSnapshot.remainingRefundableBefore, selectedRefund.currency)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                  <span className="font-medium text-muted-foreground">Authorized Refund Amount:</span>
                  <span className="font-mono text-base font-bold text-foreground">
                    {formatMoney(selectedRefund.amountMinor, selectedRefund.currency)}
                  </span>
                </div>

                {selectedRefund.calculationSnapshot.policyNotes && (
                  <p className="text-[11px] font-mono text-muted-foreground italic bg-background/50 p-2 rounded border border-border/40">
                    Policy: {selectedRefund.calculationSnapshot.policyNotes}
                  </p>
                )}
              </div>
            )}

            {/* Gateway & Reconciliation Status */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2 text-xs">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Payment Gateway & Settlement State
              </h4>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Provider</span>
                  <span className="text-foreground">{selectedRefund.provider}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Provider Refund ID</span>
                  <span className="text-foreground">{selectedRefund.providerRefundId || "Not assigned"}</span>
                </div>
              </div>

              {selectedRefund.reconciliationState && (
                <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-mono">
                  <p className="text-muted-foreground">
                    Last Gateway Check:{" "}
                    <span className="text-foreground">
                      {selectedRefund.reconciliationState.lastCheckedAt
                        ? new Date(selectedRefund.reconciliationState.lastCheckedAt).toLocaleString()
                        : "Never"}
                    </span>
                  </p>
                  {selectedRefund.reconciliationState.notes && (
                    <p className="text-muted-foreground mt-0.5">
                      Notes: {selectedRefund.reconciliationState.notes}
                    </p>
                  )}
                  {selectedRefund.reconciliationState.mismatchDetected && (
                    <p className="text-rose-600 font-bold mt-1">
                      ⚠️ Gateway Mismatch Flagged During Reconciliation!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Gateway Attempts Log */}
            {selectedRefund.attempts && selectedRefund.attempts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Provider Dispatch Attempts ({selectedRefund.attempts.length})
                </h4>
                <div className="divide-y divide-border/40 border border-border/70 rounded-xl overflow-hidden text-xs">
                  {selectedRefund.attempts.map((att, idx) => (
                    <div key={idx} className="p-3 bg-muted/10 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-foreground">Attempt #{idx + 1}</span>
                        <span className="text-muted-foreground">{att.status}</span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        Idempotency Key: {att.idempotencyKey}
                      </p>
                      {att.errorMessage && (
                        <p className="text-rose-600 text-[10px]">Error: {att.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              {selectedRefund.providerRefundId && (
                <button
                  onClick={() => handleReconcile(selectedRefund.id)}
                  disabled={actionInProgress === selectedRefund.id}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition disabled:opacity-50"
                >
                  {actionInProgress === selectedRefund.id ? "Syncing..." : "Reconcile with Gateway"}
                </button>
              )}

              {selectedRefund.status === RefundStatus.FAILED && (
                <button
                  onClick={() => handleRetry(selectedRefund.id)}
                  disabled={actionInProgress === selectedRefund.id}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 transition disabled:opacity-50"
                >
                  {actionInProgress === selectedRefund.id ? "Retrying..." : "Retry Refund"}
                </button>
              )}

              <button
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-1.5 text-xs font-mono border border-border rounded-lg hover:bg-muted text-foreground transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Refund Creation Modal */}
      {manualRefundOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualRefundSubmit}
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Issue Manual Refund
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authorized staff adjustment. Strictly validated against captured balance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualRefundOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono text-muted-foreground uppercase text-[10px]">
                  Target Order ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter MongoDB Order ID or Order Reference"
                  value={manualOrderId}
                  onChange={(e) => setManualOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/80 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-muted-foreground uppercase text-[10px]">
                  Refund Amount (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1999.00"
                  value={manualAmountRupees}
                  onChange={(e) => setManualAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/80 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-muted-foreground uppercase text-[10px]">
                  Reason / Administrative Justification
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the reason for this manual financial reversal..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="refundShipping"
                  checked={manualRefundShipping}
                  onChange={(e) => setManualRefundShipping(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="refundShipping" className="text-muted-foreground cursor-pointer">
                  Include shipping fee reimbursement in adjustment
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setManualRefundOpen(false)}
                className="px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={manualSubmitting}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              >
                {manualSubmitting ? "Dispatching..." : "Authorize & Initiate Refund"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
