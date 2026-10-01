"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  UserX,
  ChevronRight,
  Flame,
  AlertCircle,
} from "lucide-react";
import {
  AdminSupportTicketDTO,
  AdminSupportStatsDTO,
} from "@/modules/support/types/support.types";
import {
  SupportCategory,
  SupportPriority,
  SupportSlaState,
  SupportTicketStatus,
} from "@/constants/status";

const STATUS_BADGES: Record<
  SupportTicketStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [SupportTicketStatus.OPEN]: {
    label: "Open",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  [SupportTicketStatus.IN_PROGRESS]: {
    label: "In Progress",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [SupportTicketStatus.WAITING_FOR_CUSTOMER]: {
    label: "Waiting Customer",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  [SupportTicketStatus.RESOLVED]: {
    label: "Resolved",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  [SupportTicketStatus.CLOSED]: {
    label: "Closed",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
  },
  [SupportTicketStatus.REOPENED]: {
    label: "Reopened",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-800 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
};

const PRIORITY_BADGES: Record<
  SupportPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  [SupportPriority.LOW]: {
    label: "Low",
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    border: "border-neutral-200",
  },
  [SupportPriority.MEDIUM]: {
    label: "Medium",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  [SupportPriority.HIGH]: {
    label: "High",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  [SupportPriority.URGENT]: {
    label: "Urgent",
    bg: "bg-rose-100",
    text: "text-rose-900 font-semibold",
    border: "border-rose-300",
  },
};

export function AdminSupportManager() {
  const [tickets, setTickets] = React.useState<AdminSupportTicketDTO[]>([]);
  const [stats, setStats] = React.useState<AdminSupportStatsDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Pagination
  const [queueTab, setQueueTab] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");
  const [slaFilter, setSlaFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Load KPI Stats
  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load support stats", err);
    }
  }, []);

  // Load Tickets
  const fetchTickets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (queueTab !== "ALL") {
        params.append("queue", queueTab);
      }
      if (categoryFilter !== "ALL") {
        params.append("category", categoryFilter);
      }
      if (priorityFilter !== "ALL") {
        params.append("priority", priorityFilter);
      }
      if (slaFilter !== "ALL") {
        params.append("slaState", slaFilter);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load support queue.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setTickets(json.data.items || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
      } else {
        throw new Error(json.error?.message || "Failed to load support queue.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support queue.");
    } finally {
      setLoading(false);
    }
  }, [page, queueTab, categoryFilter, priorityFilter, slaFilter, search]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleQueueTab = (tab: string) => {
    setQueueTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-500">
            Operations & Client Care
          </span>
          <h1 className="text-2xl font-serif text-neutral-900 dark:text-neutral-100 tracking-tight mt-1">
            Customer Support Queue
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Triage, assign, and respond to inquiries with SLA tracking, internal notes, and anti-IDOR context.
          </p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchTickets();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
              Total Inquiries
            </span>
            <span className="text-2xl font-serif font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
              {stats.totalTickets}
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 block tracking-wider">
              Open Tickets
            </span>
            <span className="text-2xl font-serif font-bold text-blue-700 dark:text-blue-300 mt-1 block">
              {stats.openTickets}
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 block tracking-wider">
              Unassigned
            </span>
            <span className="text-2xl font-serif font-bold text-amber-700 dark:text-amber-300 mt-1 block">
              {stats.unassignedTickets}
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400 block tracking-wider">
              Awaiting Client
            </span>
            <span className="text-2xl font-serif font-bold text-purple-700 dark:text-purple-300 mt-1 block">
              {stats.waitingCustomerTickets}
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 block tracking-wider">
              Urgent Priority
            </span>
            <span className="text-2xl font-serif font-bold text-rose-700 dark:text-rose-300 mt-1 block">
              {stats.urgentTickets}
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-rose-700 dark:text-rose-500 block tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-600" />
              <span>SLA Breached</span>
            </span>
            <span className="text-2xl font-serif font-bold text-rose-800 dark:text-rose-400 mt-1 block">
              {stats.slaBreachedTickets}
            </span>
          </div>
        </div>
      )}

      {/* Queue Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 text-xs">
        {[
          { id: "ALL", label: "All Tickets" },
          { id: "UNASSIGNED", label: "Unassigned Queue" },
          { id: "URGENT", label: "Urgent Escalations" },
          { id: "WAITING_FOR_CUSTOMER", label: "Waiting on Customer" },
          { id: "OPEN", label: "Open Inquiries" },
          { id: "RESOLVED", label: "Resolved" },
          { id: "CLOSED", label: "Closed Archive" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleQueueTab(tab.id)}
            className={`px-3 py-1.5 transition-colors border ${
              queueTab === tab.id
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 font-semibold"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search ticket #, subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-8 pr-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {Object.values(SupportCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 shrink-0">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            {Object.values(SupportPriority).map((pri) => (
              <option key={pri} value={pri}>
                {pri}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 shrink-0">SLA:</span>
          <select
            value={slaFilter}
            onChange={(e) => {
              setSlaFilter(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="ALL">All SLA States</option>
            {Object.values(SupportSlaState).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table / Queue */}
      {loading ? (
        <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
          <span className="text-xs text-neutral-500 mt-2 block">Loading support inquiries...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs text-rose-800 dark:text-rose-300">{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Queue is Clear
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            No support inquiries matched the selected queue or filter parameters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Subject & Category</th>
                <th className="py-3 px-4">Priority & SLA</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {tickets.map((t) => {
                const statusBadge = STATUS_BADGES[t.status] || STATUS_BADGES[SupportTicketStatus.OPEN];
                const priorityBadge = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES[SupportPriority.MEDIUM];

                return (
                  <tr
                    key={t.ticketNumber}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      <Link
                        href={`/admin/support/${t.ticketNumber}`}
                        className="hover:underline text-amber-700 dark:text-amber-400"
                      >
                        {t.ticketNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {t.customerName || "Customer"}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-[140px]">
                        {t.customerEmail || t.customerId}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="text-neutral-900 dark:text-neutral-100 font-medium truncate">
                        {t.subject}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-semibold text-neutral-500">
                          {t.category}
                        </span>
                        {t.orderNumber && (
                          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                            #{t.orderNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] uppercase font-medium border ${priorityBadge.bg} ${priorityBadge.text} ${priorityBadge.border}`}
                        >
                          {priorityBadge.label}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium ${
                            t.sla.state === SupportSlaState.BREACHED
                              ? "bg-rose-100 text-rose-900 font-bold"
                              : t.sla.state === SupportSlaState.AT_RISK
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {t.sla.state.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.assignedTo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-800 dark:text-neutral-200">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span>{t.assignedTo.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200">
                          <UserX className="w-3 h-3" />
                          <span>Unassigned</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] uppercase font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                      {new Date(t.lastMessageAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/support/${t.ticketNumber}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] font-medium hover:bg-neutral-800 transition-colors"
                      >
                        <span>Open Console</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                Showing {tickets.length} of {total} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-neutral-300 dark:border-neutral-700 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-neutral-300 dark:border-neutral-700 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
