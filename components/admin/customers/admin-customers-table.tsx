"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Eye,
  Download,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { CustomerStatus } from "@/constants/status";
import { AdminCustomerListItemDTO } from "@/modules/admin/types/admin-management.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminCustomersTable() {
  const [customers, setCustomers] = React.useState<AdminCustomerListItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Status Action Modal State
  const [actionCustomer, setActionCustomer] = React.useState<AdminCustomerListItemDTO | null>(null);
  const [actionType, setActionType] = React.useState<"SUSPEND" | "RESTORE">("SUSPEND");
  const [actionReason, setActionReason] = React.useState("");
  const [actionInProgress, setActionInProgress] = React.useState(false);

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load customers");
      }

      setCustomers(json.data.data);
      setTotal(json.data.pagination.total);
      setTotalPages(json.data.pagination.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleStatusTransition = async () => {
    if (!actionCustomer) return;
    try {
      setActionInProgress(true);
      setError(null);

      const endpoint =
        actionType === "SUSPEND"
          ? `/api/admin/customers/${actionCustomer.id}/suspend`
          : `/api/admin/customers/${actionCustomer.id}/restore`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: actionReason.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update customer status");
      }

      setSuccessMessage(
        `Customer ${actionCustomer.email} successfully ${
          actionType === "SUSPEND" ? "suspended" : "restored"
        }`
      );
      setActionCustomer(null);
      setActionReason("");
      fetchCustomers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers/export?format=${format}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to export customers");
      }

      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verona-customers-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Total Accounts
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">
              {total}
            </p>
          </div>
          <Users className="h-8 w-8 text-primary/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Active Customers
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-emerald-600 dark:text-emerald-400">
              {customers.filter((c) => c.status === CustomerStatus.ACTIVE).length}
            </p>
          </div>
          <UserCheck className="h-8 w-8 text-emerald-500/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Suspended Accounts
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-rose-600 dark:text-rose-400">
              {customers.filter((c) => c.status === CustomerStatus.SUSPENDED).length}
            </p>
          </div>
          <UserX className="h-8 w-8 text-rose-500/40" />
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-sm text-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto h-7 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto h-7 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Search, Filter & Actions Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone, or customer ID..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={CustomerStatus.ACTIVE}>Active</option>
            <option value={CustomerStatus.SUSPENDED}>Suspended</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers()}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={loading || customers.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Orders & Value</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading client profiles...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No customer accounts match the current query.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {c.email}
                      </div>
                      {c.phone && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.status === CustomerStatus.ACTIVE ? (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                          Suspended
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] flex items-center gap-1">
                          {c.emailVerified ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          Email {c.emailVerified ? "Verified" : "Unverified"}
                        </span>
                        <span className="text-[11px] flex items-center gap-1">
                          {c.phoneVerified ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          Phone {c.phoneVerified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-foreground">
                        {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        ₹{(c.totalSpendMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/customers/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </Link>
                        {c.status === CustomerStatus.ACTIVE ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionCustomer(c);
                              setActionType("SUSPEND");
                              setActionReason("");
                            }}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionCustomer(c);
                              setActionType("RESTORE");
                              setActionReason("");
                            }}
                            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div>
            Showing {customers.length} of {total} accounts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Suspension / Restoration */}
      {actionCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  actionType === "SUSPEND"
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  Confirm Account {actionType === "SUSPEND" ? "Suspension" : "Restoration"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {actionCustomer.email}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {actionType === "SUSPEND"
                ? "Suspending this client will immediately prevent access to checkout, returns, and support interactions. Existing financial and order history will remain preserved."
                : "Restoring this client will re-enable normal account privileges and platform access."}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-muted-foreground">
                Operational Reason
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide audit justification (minimum 3 characters)..."
                rows={3}
                className="w-full p-2.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionCustomer(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === "SUSPEND" ? "destructive" : "primary"}
                size="sm"
                onClick={handleStatusTransition}
                disabled={actionInProgress || actionReason.trim().length < 3}
                className="gap-1.5"
              >
                {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm {actionType === "SUSPEND" ? "Suspension" : "Restoration"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
