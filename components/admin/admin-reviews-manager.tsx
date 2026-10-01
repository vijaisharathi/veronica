"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Star,
  ShieldCheck,
  EyeOff,
  Flag,
  Layers,
  ExternalLink,
} from "lucide-react";
import { ReviewStatus, ReviewModerationReason } from "@/constants/status";
import { ReviewAdminDTO } from "@/modules/reviews/types/review.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminReviewsManager() {
  const [reviews, setReviews] = React.useState<ReviewAdminDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [ratingFilter, setRatingFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Selected Review for Modal
  const [selectedReview, setSelectedReview] = React.useState<ReviewAdminDTO | null>(null);
  const [moderationReason, setModerationReason] = React.useState<ReviewModerationReason>(
    ReviewModerationReason.SPAM
  );
  const [moderationNotes, setModerationNotes] = React.useState("");
  const [actionInProgress, setActionInProgress] = React.useState(false);

  // Reconcile Modal State
  const [reconcileProductId, setReconcileProductId] = React.useState("");
  const [reconcileModalOpen, setReconcileModalOpen] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);

  // Metrics (computed from current dataset or live counts)
  const [kpiCounts, setKpiCounts] = React.useState({
    total: 0,
    pending: 0,
    published: 0,
    reported: 0,
    hidden: 0,
    rejected: 0,
  });

  const fetchReviews = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (statusFilter === "REPORTED") {
        params.set("reportedOnly", "true");
      } else if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (ratingFilter !== "ALL") {
        params.set("rating", ratingFilter);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch admin reviews queue");

      const data = await res.json();
      const fetchedReviews: ReviewAdminDTO[] = data.data?.reviews || [];
      const pagination = data.data?.pagination || { total: 0, totalPages: 1 };

      setReviews(fetchedReviews);
      setTotal(pagination.total);
      setTotalPages(pagination.totalPages);

      // Compute status counts
      setKpiCounts((prev) => ({
        ...prev,
        total: pagination.total,
        pending: fetchedReviews.filter((r) => r.status === ReviewStatus.PENDING).length,
        published: fetchedReviews.filter((r) => r.status === ReviewStatus.PUBLISHED).length,
        reported: fetchedReviews.filter((r) => r.reportCount > 0).length,
        hidden: fetchedReviews.filter((r) => r.status === ReviewStatus.HIDDEN).length,
        rejected: fetchedReviews.filter((r) => r.status === ReviewStatus.REJECTED).length,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading reviews");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, ratingFilter, search]);

  React.useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Moderation Action (Publish, Reject, Hide, Restore)
  const handleModeration = async (
    action: "publish" | "reject" | "hide" | "restore",
    reviewId: string
  ) => {
    try {
      setActionInProgress(true);
      setError(null);

      const payload: Record<string, string> = {};
      if (moderationNotes.trim()) {
        payload.notes = moderationNotes.trim();
      }

      if (action === "reject" || action === "hide") {
        payload.reason = moderationReason;
      }

      const res = await fetch(`/api/admin/reviews/${reviewId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to ${action} review`);
      }

      setSuccessMessage(`Review ${reviewId} successfully marked as ${action.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setModerationNotes("");

      // Update selected review view or close
      await fetchReviews();
      if (selectedReview && selectedReview.id === reviewId) {
        const updatedRes = await fetch(`/api/admin/reviews/${reviewId}`);
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          setSelectedReview(updatedData.data);
        } else {
          setSelectedReview(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Action failed`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Report Resolution
  const handleResolveReport = async (
    reportId: string,
    action: "HIDE_REVIEW" | "DISMISS_REPORT",
    reviewId: string
  ) => {
    try {
      setActionInProgress(true);
      setError(null);

      const res = await fetch(`/api/admin/review-reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          resolutionNotes: moderationNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to resolve report");
      }

      setSuccessMessage(`Report ${reportId} resolved with action ${action}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setModerationNotes("");

      await fetchReviews();
      if (selectedReview && selectedReview.id === reviewId) {
        const updatedRes = await fetch(`/api/admin/reviews/${reviewId}`);
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          setSelectedReview(updatedData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report resolution failed");
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Aggregate Reconciliation
  const handleReconcileAggregates = async (productId: string) => {
    if (!productId.trim()) return;
    try {
      setReconciling(true);
      setError(null);

      const res = await fetch("/api/admin/reviews/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Reconciliation failed");
      }

      const data = await res.json();
      setSuccessMessage(
        `Rating aggregates reconciled: Avg ${data.data?.averageRating?.toFixed(2) || 0} (${data.data?.totalReviews || 0} reviews)`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      setReconcileModalOpen(false);
      setReconcileProductId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation error");
    } finally {
      setReconciling(false);
    }
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case ReviewStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case ReviewStatus.PUBLISHED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Published
          </span>
        );
      case ReviewStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      case ReviewStatus.HIDDEN:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
            <EyeOff className="h-3 w-3" />
            Hidden
          </span>
        );
      case ReviewStatus.DELETED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <X className="h-3 w-3" />
            Deleted
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Phase 24 — Quality & Reputation
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span className="text-xs text-muted-foreground">Reviews &amp; Ratings Moderation</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground mt-1">
            Customer Reviews Moderation Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Inspect, approve, reject, or hide customer product reviews and resolve abuse reports with full audit integrity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReconcileModalOpen(true)}
            className="text-xs tracking-wider uppercase"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Reconcile Aggregates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            disabled={loading}
            className="text-xs tracking-wider uppercase"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-sm border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-sm border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setStatusFilter("ALL");
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-neutral-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Total Reviews
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">{total}</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter(ReviewStatus.PENDING);
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === ReviewStatus.PENDING
              ? "border-amber-500 bg-amber-500/5 shadow-sm"
              : "border-border bg-card hover:border-amber-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">
            Pending Approval
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">
            {kpiCounts.pending}
          </p>
        </div>

        <div
          onClick={() => {
            setStatusFilter(ReviewStatus.PUBLISHED);
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === ReviewStatus.PUBLISHED
              ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
              : "border-border bg-card hover:border-emerald-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
            Published Live
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">
            {kpiCounts.published}
          </p>
        </div>

        <div
          onClick={() => {
            setStatusFilter("REPORTED");
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === "REPORTED"
              ? "border-rose-500 bg-rose-500/5 shadow-sm"
              : "border-border bg-card hover:border-rose-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-medium">
            Flagged Abuse
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">
            {kpiCounts.reported}
          </p>
        </div>

        <div
          onClick={() => {
            setStatusFilter(ReviewStatus.HIDDEN);
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === ReviewStatus.HIDDEN
              ? "border-neutral-500 bg-neutral-500/5 shadow-sm"
              : "border-border bg-card hover:border-neutral-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-medium">
            Hidden
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">
            {kpiCounts.hidden}
          </p>
        </div>

        <div
          onClick={() => {
            setStatusFilter(ReviewStatus.REJECTED);
            setPage(1);
          }}
          className={`p-4 rounded-sm border transition-all cursor-pointer ${
            statusFilter === ReviewStatus.REJECTED
              ? "border-rose-500 bg-rose-500/5 shadow-sm"
              : "border-border bg-card hover:border-rose-400"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-medium">
            Rejected
          </p>
          <p className="text-xl font-serif font-semibold text-foreground mt-1">
            {kpiCounts.rejected}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by review title, content, customer name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Rating filter dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Ratings (1-5)</option>
            <option value="5">★ 5 Stars Only</option>
            <option value="4">★ 4 Stars Only</option>
            <option value="3">★ 3 Stars Only</option>
            <option value="2">★ 2 Stars Only</option>
            <option value="1">★ 1 Star Only</option>
          </select>

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={ReviewStatus.PENDING}>Pending</option>
            <option value={ReviewStatus.PUBLISHED}>Published</option>
            <option value="REPORTED">Flagged Abuse Only</option>
            <option value={ReviewStatus.HIDDEN}>Hidden</option>
            <option value={ReviewStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Review Table */}
      <div className="border border-border rounded-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 font-medium">Customer &amp; Rating</th>
                <th className="p-3 font-medium">Product / Variant</th>
                <th className="p-3 font-medium">Review Title &amp; Excerpt</th>
                <th className="p-3 font-medium text-center">Media</th>
                <th className="p-3 font-medium text-center">Status</th>
                <th className="p-3 font-medium text-center">Reports</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading customer review moderation queue...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No reviews match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                    {/* Customer & Rating */}
                    <td className="p-3 align-top min-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{r.customerDisplayName}</span>
                          {r.verifiedPurchase && (
                            <span title="Verified Purchase">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < r.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-700"
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Product / Variant */}
                    <td className="p-3 align-top min-w-[180px]">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground truncate max-w-[200px]" title={r.productName || r.productId}>
                          {r.productName || `Product #${r.productId.slice(-6)}`}
                        </p>
                        {r.variantSnapshot && (
                          <p className="text-[11px] text-muted-foreground">
                            {r.variantSnapshot.color ? `${r.variantSnapshot.color} / ` : ""}
                            {r.variantSnapshot.size || "Standard"}
                          </p>
                        )}
                        {r.orderNumber && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Order #{r.orderNumber}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Review Title & Excerpt */}
                    <td className="p-3 align-top max-w-[280px]">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                          {r.comment}
                        </p>
                      </div>
                    </td>

                    {/* Media */}
                    <td className="p-3 align-top text-center">
                      {r.media && r.media.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-foreground border border-border">
                          📷 {r.media.length}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 align-top text-center">
                      {getStatusBadge(r.status)}
                    </td>

                    {/* Reports */}
                    <td className="p-3 align-top text-center">
                      {r.reportCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <Flag className="h-3 w-3" />
                          {r.reportCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">0</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 align-top text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReview(r)}
                        className="text-[11px] h-7 px-2.5 tracking-wider uppercase"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {reviews.length} of {total} reviews (Page {page} of {totalPages || 1})
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs h-7"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs h-7"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Review Inspection & Moderation Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background border border-border rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    Review #{selectedReview.id.slice(-8)}
                  </span>
                  {getStatusBadge(selectedReview.status)}
                  {selectedReview.verifiedPurchase && (
                    <Badge variant="secondary" className="text-[10px] text-primary">
                      ✓ Verified Purchase
                    </Badge>
                  )}
                </div>
                <h3 className="font-serif text-lg font-medium text-foreground mt-1">
                  {selectedReview.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product & Customer Details */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-sm text-xs border border-border">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase text-[10px] tracking-wider">Product</p>
                <p className="font-medium text-foreground">{selectedReview.productName || selectedReview.productId}</p>
                {selectedReview.variantSnapshot && (
                  <p className="text-muted-foreground text-[11px]">
                    Size: {selectedReview.variantSnapshot.size || "N/A"} | Color: {selectedReview.variantSnapshot.color || "N/A"}
                  </p>
                )}
                {selectedReview.orderNumber && (
                  <p className="text-muted-foreground text-[11px]">
                    Order: #{selectedReview.orderNumber}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase text-[10px] tracking-wider">Customer</p>
                <p className="font-medium text-foreground">{selectedReview.customerDisplayName}</p>
                <p className="text-muted-foreground font-mono text-[10px]">
                  ID: {selectedReview.customerId}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Helpful: {selectedReview.helpfulCount} | Reports: {selectedReview.reportCount}
                </p>
              </div>
            </div>

            {/* Rating & Review Content */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < selectedReview.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-700"
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2 font-medium">
                  {selectedReview.rating} out of 5 stars
                </span>
              </div>

              <div className="p-4 bg-card border border-border rounded-sm">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                  {selectedReview.comment}
                </p>
              </div>
            </div>

            {/* Photos Gallery */}
            {selectedReview.media && selectedReview.media.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Attached Photos ({selectedReview.media.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedReview.media.map((m, idx) => (
                    <a
                      key={idx}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative w-20 h-20 rounded border border-border overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.url}
                        alt={`Review photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Moderation Notes & Reason */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Moderation Reason (Required if Rejecting or Hiding)
                </label>
                <select
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value as ReviewModerationReason)}
                  className="w-full p-2 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={ReviewModerationReason.SPAM}>SPAM — Unsolicited or advertising content</option>
                  <option value={ReviewModerationReason.ABUSIVE_CONTENT}>ABUSIVE_CONTENT — Profanity or hate speech</option>
                  <option value={ReviewModerationReason.IRRELEVANT}>IRRELEVANT — Not related to the garment</option>
                  <option value={ReviewModerationReason.POLICY_VIOLATION}>POLICY_VIOLATION — Violates community standards</option>
                  <option value={ReviewModerationReason.DUPLICATE}>DUPLICATE — Repeated submission</option>
                  <option value={ReviewModerationReason.CUSTOMER_REQUEST}>CUSTOMER_REQUEST — Author requested removal</option>
                  <option value={ReviewModerationReason.OTHER}>OTHER — Miscellaneous operational reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Internal Staff Notes (Audit Logged)
                </label>
                <textarea
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  placeholder="Optional internal context for this moderation decision..."
                  rows={2}
                  className="w-full p-2 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Active Reports Resolution if flagged */}
            {selectedReview.reports && selectedReview.reports.length > 0 && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-sm space-y-2">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium text-xs">
                  <Flag className="h-3.5 w-3.5" />
                  <span>Abuse Reports ({selectedReview.reports.length})</span>
                </div>
                {selectedReview.reports.map((rep) => (
                  <div key={rep.id} className="flex items-center justify-between text-xs py-1 border-b border-rose-500/10 last:border-0">
                    <div>
                      <span className="font-semibold text-foreground uppercase text-[10px]">
                        [{rep.reason}]
                      </span>{" "}
                      <span className="text-muted-foreground">{rep.comment || "No detail provided"}</span>
                    </div>
                    {rep.status === "PENDING" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionInProgress}
                          onClick={() => handleResolveReport(rep.id, "HIDE_REVIEW", selectedReview.id)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Hide Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionInProgress}
                          onClick={() => handleResolveReport(rep.id, "DISMISS_REPORT", selectedReview.id)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReconcileAggregates(selectedReview.productId)}
                disabled={reconciling}
                className="text-xs"
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                Reconcile Product Aggregates
              </Button>

              <div className="flex items-center gap-2">
                {/* Pending State -> Approve or Reject */}
                {selectedReview.status === ReviewStatus.PENDING && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionInProgress}
                      onClick={() => handleModeration("reject", selectedReview.id)}
                      className="text-xs text-rose-600 hover:text-rose-700"
                    >
                      Reject Review
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionInProgress}
                      onClick={() => handleModeration("publish", selectedReview.id)}
                      className="text-xs uppercase tracking-wider"
                    >
                      Approve &amp; Publish
                    </Button>
                  </>
                )}

                {/* Published State -> Hide or Reject */}
                {selectedReview.status === ReviewStatus.PUBLISHED && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionInProgress}
                      onClick={() => handleModeration("hide", selectedReview.id)}
                      className="text-xs text-neutral-600 dark:text-neutral-400"
                    >
                      Hide from Storefront
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={actionInProgress}
                      onClick={() => handleModeration("reject", selectedReview.id)}
                      className="text-xs"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {/* Hidden or Rejected State -> Restore */}
                {(selectedReview.status === ReviewStatus.HIDDEN ||
                  selectedReview.status === ReviewStatus.REJECTED) && (
                  <Button
                    size="sm"
                    disabled={actionInProgress}
                    onClick={() => handleModeration("restore", selectedReview.id)}
                    className="text-xs uppercase tracking-wider"
                  >
                    Restore to Published
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Reconciliation Modal */}
      {reconcileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Reconcile Rating Aggregates
              </h3>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Deterministically recalculate average rating, review count, and star distribution directly from published reviews for a given product ID.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Product ID / MongoDB ObjectId</label>
              <input
                type="text"
                value={reconcileProductId}
                onChange={(e) => setReconcileProductId(e.target.value)}
                placeholder="e.g. 64b8f... or Product ID"
                className="w-full p-2 text-xs bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReconcileModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!reconcileProductId.trim() || reconciling}
                onClick={() => handleReconcileAggregates(reconcileProductId)}
                className="text-xs uppercase tracking-wider"
              >
                {reconciling ? "Reconciling..." : "Run Reconciliation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
