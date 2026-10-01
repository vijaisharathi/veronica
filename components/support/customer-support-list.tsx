"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Filter,
  Package,
  RotateCcw,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { CustomerSupportTicketDTO } from "@/modules/support/types/support.types";
import { SupportCategory, SupportTicketStatus } from "@/constants/status";

const STATUS_CONFIG: Record<
  SupportTicketStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  [SupportTicketStatus.OPEN]: {
    label: "Inquiry Opened",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: HelpCircle,
  },
  [SupportTicketStatus.IN_PROGRESS]: {
    label: "Under Review",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  [SupportTicketStatus.WAITING_FOR_CUSTOMER]: {
    label: "Awaiting Your Response",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: MessageSquare,
  },
  [SupportTicketStatus.RESOLVED]: {
    label: "Resolved",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  [SupportTicketStatus.CLOSED]: {
    label: "Closed",
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    border: "border-neutral-200",
    icon: ShieldCheck,
  },
  [SupportTicketStatus.REOPENED]: {
    label: "Reopened",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: RotateCcw,
  },
};

const CATEGORY_ICONS: Record<SupportCategory, React.ElementType> = {
  [SupportCategory.ORDER]: Package,
  [SupportCategory.PAYMENT]: CreditCard,
  [SupportCategory.DELIVERY]: Package,
  [SupportCategory.RETURN]: RotateCcw,
  [SupportCategory.REFUND]: CreditCard,
  [SupportCategory.PRODUCT]: ShieldCheck,
  [SupportCategory.ACCOUNT]: ShieldCheck,
  [SupportCategory.TECHNICAL]: RefreshCw,
  [SupportCategory.OTHER]: HelpCircle,
};

export function CustomerSupportList() {
  const [tickets, setTickets] = React.useState<CustomerSupportTicketDTO[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");

  const fetchTickets = React.useCallback(async (p: number, status: string, category: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        limit: "10",
      });

      if (status !== "ALL") {
        params.append("status", status);
      }
      if (category !== "ALL") {
        params.append("category", category);
      }

      const res = await fetch(`/api/account/support?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load your support inquiries.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setTickets(json.data.items || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
        setPage(json.data.page || 1);
      } else {
        throw new Error(json.error?.message || "Failed to load support inquiries.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets(page, statusFilter, categoryFilter);
  }, [fetchTickets, page, statusFilter, categoryFilter]);

  const handleStatusTab = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="text-[11px] font-medium tracking-widest uppercase text-amber-700">
            Client Concierge & Care
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-neutral-900 mt-1 tracking-tight">
            Support Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            Communicate directly with our dedicated concierge specialists regarding orders,
            garment care, deliveries, or artisanal adjustments.
          </p>
        </div>
        <Link
          href="/account/support/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs uppercase tracking-widest font-medium rounded-none shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Inquiry</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-neutral-200/80 shadow-xs">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: "ALL", label: "All Inquiries" },
            { id: SupportTicketStatus.OPEN, label: "Open" },
            { id: SupportTicketStatus.IN_PROGRESS, label: "In Review" },
            { id: SupportTicketStatus.WAITING_FOR_CUSTOMER, label: "Action Required" },
            { id: SupportTicketStatus.RESOLVED, label: "Resolved" },
            { id: SupportTicketStatus.CLOSED, label: "Closed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusTab(tab.id)}
              className={`px-3 py-1.5 transition-colors border ${
                statusFilter === tab.id
                  ? "bg-neutral-900 text-white border-neutral-900 font-medium"
                  : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-500 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="text-xs border border-neutral-200 bg-white px-2.5 py-1.5 focus:outline-none focus:border-neutral-900 text-neutral-700"
          >
            <option value="ALL">All Categories</option>
            {Object.values(SupportCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200 p-6 animate-pulse space-y-3"
            >
              <div className="h-4 bg-neutral-100 rounded w-1/4" />
              <div className="h-5 bg-neutral-100 rounded w-3/4" />
              <div className="h-3 bg-neutral-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-medium text-rose-900">{error}</h3>
          <button
            onClick={() => fetchTickets(page, statusFilter, categoryFilter)}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
            <FolderOpen className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-serif text-neutral-900">No Inquiries Found</h3>
            <p className="text-xs text-neutral-500">
              {statusFilter !== "ALL" || categoryFilter !== "ALL"
                ? "No support inquiries match your active filters. Try adjusting or clearing your criteria."
                : "You do not have any open or previous customer support inquiries on file."}
            </p>
          </div>
          <Link
            href="/account/support/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs uppercase tracking-widest font-medium rounded-none"
          >
            <Plus className="w-4 h-4" />
            <span>Submit First Inquiry</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-neutral-400 tracking-wide">
            Showing {tickets.length} of {total} total inquiries
          </div>

          <div className="divide-y divide-neutral-200/80 border border-neutral-200/80 bg-white">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG[SupportTicketStatus.OPEN];
              const StatusIcon = statusCfg.icon;
              const CatIcon = CATEGORY_ICONS[ticket.category] || HelpCircle;

              return (
                <Link
                  key={ticket.ticketNumber}
                  href={`/account/support/${ticket.ticketNumber}`}
                  className="group block p-5 sm:p-6 hover:bg-neutral-50/70 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold tracking-wider text-neutral-900 group-hover:text-amber-800 transition-colors">
                        {ticket.ticketNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-medium bg-neutral-100 text-neutral-700">
                        <CatIcon className="w-3 h-3 text-neutral-500" />
                        <span>{ticket.category}</span>
                      </span>
                      {ticket.orderNumber && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200/60">
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>Order #{ticket.orderNumber}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusCfg.label}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </div>

                  <h3 className="font-serif text-base sm:text-lg text-neutral-900 mt-2 font-normal group-hover:text-neutral-700 transition-colors">
                    {ticket.subject}
                  </h3>

                  <div className="flex items-center gap-4 text-[11px] text-neutral-400 mt-3 pt-3 border-t border-neutral-100">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Created {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}</span>
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span>
                      Last response{" "}
                      {new Date(ticket.lastMessageAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 border border-neutral-200 text-xs font-medium uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-500 font-mono">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-4 py-2 border border-neutral-200 text-xs font-medium uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
