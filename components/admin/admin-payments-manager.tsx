/**
 * VÉRONA — Admin Payment Management Console (Phase 27)
 *
 * Operational interface for inspecting payments, tracking provider attempts,
 * reviewing payment failures, and executing authoritative gateway reconciliation.
 */

"use client";

import * as React from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PaymentStatus } from "@/constants/status";
import { AdminPaymentDetailDTO } from "@/modules/admin/types/admin.types";

interface PaymentListItem {
  id: string;
  checkoutSessionId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountMinor: number;
  amountFormatted: string;
  currency: string;
  status: string;
  method?: string;
  attemptsCount: number;
  createdAt: string;
  updatedAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case PaymentStatus.CAPTURED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 rounded">
          <CheckCircle2 className="h-3 w-3" />
          CAPTURED
        </span>
      );
    case PaymentStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 rounded">
          <Clock className="h-3 w-3" />
          PENDING
        </span>
      );
    case PaymentStatus.FAILED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 rounded">
          <XCircle className="h-3 w-3" />
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 rounded">
          {status}
        </span>
      );
  }
}

export function AdminPaymentsManager() {
  const [payments, setPayments] = React.useState<PaymentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Detail Modal State
  const [selectedPayment, setSelectedPayment] = React.useState<AdminPaymentDetailDTO | null>(null);
  const [_detailLoading, setDetailLoading] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);
  const [reconcileMsg, setReconcileMsg] = React.useState<{ success: boolean; message: string } | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load payment records");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data.payments);
        setTotalPages(json.data.pagination.totalPages);
        setTotalCount(json.data.pagination.total);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openPaymentDetail = async (paymentId: string) => {
    setDetailLoading(true);
    setReconcileMsg(null);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`);
      if (!res.ok) throw new Error("Failed to load payment detail");
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedPayment(json.data);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error loading payment");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (!selectedPayment) return;
    setReconciling(true);
    setReconcileMsg(null);
    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/reconcile`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Reconciliation failed");
      }
      setSelectedPayment(json.data);
      setReconcileMsg({
        success: true,
        message: `Reconciliation complete. Status is now ${json.data.status}.`,
      });
      fetchPayments();
    } catch (err: unknown) {
      setReconcileMsg({
        success: false,
        message: err instanceof Error ? err.message : "Reconciliation failed",
      });
    } finally {
      setReconciling(false);
    }
  };

  const STATUS_TABS = [
    { key: "ALL", label: "All Payments" },
    { key: PaymentStatus.CAPTURED, label: "Captured" },
    { key: PaymentStatus.PENDING, label: "Pending" },
    { key: PaymentStatus.FAILED, label: "Failed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-normal text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-foreground" />
            Payment Operations & Reconciliation
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative financial settlement overview, attempt logs, and payment gateway verification.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search provider order ID or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <div className="p-6 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <span className="text-xs text-rose-700 dark:text-rose-300">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPayments} className="text-xs">
            Retry
          </Button>
        </div>
      ) : loading && payments.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner className="h-6 w-6 text-foreground" />
          <span className="text-xs">Loading payment transactions...</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-16 border border-dashed border-border rounded text-center text-muted-foreground">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No payment records found</p>
          <p className="text-xs mt-1">There are no payment attempts matching the selected criteria.</p>
        </div>
      ) : (
        <div className="border border-border rounded overflow-x-auto bg-background shadow-subtle">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-border text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Provider Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                    {p.providerOrderId || p.providerPaymentId || p.id.slice(-8)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-foreground">{p.customerName}</p>
                    <p className="text-[11px] text-neutral-400">{p.customerEmail}</p>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                    {p.amountFormatted}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(p.status)}</td>
                  <td className="py-3 px-4 whitespace-nowrap text-neutral-500 font-mono">
                    {p.attemptsCount} attempt(s)
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPaymentDetail(p.id)}
                      className="text-xs h-7 px-2"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Bar */}
          <div className="py-3 px-4 border-t border-border flex items-center justify-between text-xs text-neutral-500">
            <span>
              Showing {payments.length} of {totalCount} transactions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="text-xs h-7 px-2"
              >
                Previous
              </Button>
              <span className="font-mono">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="text-xs h-7 px-2"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">Payment Details</h2>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-1">ID: {selectedPayment.id}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reconciliation alert feedback */}
            {reconcileMsg && (
              <div
                className={`mt-4 p-3 rounded text-xs border ${
                  reconcileMsg.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                }`}
              >
                {reconcileMsg.message}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-neutral-50 dark:bg-neutral-950 rounded border border-border text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Amount</span>
                  <span className="font-semibold text-sm text-foreground">{selectedPayment.amountFormatted}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Provider</span>
                  <span className="font-medium text-foreground">{selectedPayment.provider}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Customer</span>
                  <span className="font-medium text-foreground truncate block">{selectedPayment.customerName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Session Ref</span>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400 truncate block">
                    {selectedPayment.checkoutSessionId.slice(-8)}
                  </span>
                </div>
              </div>

              {/* Provider References */}
              <div className="space-y-2 text-xs">
                <h3 className="font-semibold uppercase text-[10px] tracking-wider text-neutral-400">
                  Provider Identifiers
                </h3>
                <div className="space-y-1.5 p-3 border border-border rounded font-mono text-[11px] bg-background">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Provider Order ID:</span>
                    <span className="text-foreground">{selectedPayment.providerOrderId || "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Provider Payment ID:</span>
                    <span className="text-foreground">{selectedPayment.providerPaymentId || "None"}</span>
                  </div>
                </div>
              </div>

              {/* Attempt History */}
              <div className="space-y-2 text-xs">
                <h3 className="font-semibold uppercase text-[10px] tracking-wider text-neutral-400">
                  Attempt History ({selectedPayment.attempts.length})
                </h3>
                <div className="divide-y divide-border border border-border rounded overflow-hidden">
                  {selectedPayment.attempts.map((att, idx) => (
                    <div key={att.attemptId || idx} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-foreground">
                          {att.attemptId}
                        </span>
                        {getStatusBadge(att.status)}
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-500">
                        <span>{new Date(att.createdAt).toLocaleString("en-IN")}</span>
                        <span>{att.amountFormatted}</span>
                      </div>
                      {att.failureMessage && (
                        <p className="text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded mt-1">
                          {att.failureCode ? `[${att.failureCode}] ` : ""}
                          {att.failureMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconcile}
                disabled={reconciling}
                className="text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? "animate-spin" : ""}`} />
                {reconciling ? "Reconciling..." : "Reconcile with Gateway"}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedPayment(null)}
                className="text-xs"
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
