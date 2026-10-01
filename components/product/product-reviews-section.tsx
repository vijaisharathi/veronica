"use client";

import * as React from "react";
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  Flag,
  ArrowUpDown,
  Camera,
  ShieldCheck,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  ReviewPublicDTO,
  ReviewSummaryDTO,
} from "@/modules/reviews/types/review.types";
import { WriteReviewModal } from "./write-review-modal";
import { ReviewReportReason } from "@/constants/status";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  productImage?: string;
}

export function ProductReviewsSection({
  productId,
  productName,
  productImage,
}: ProductReviewsSectionProps) {
  const [summary, setSummary] = React.useState<ReviewSummaryDTO | null>(null);
  const [reviews, setReviews] = React.useState<ReviewPublicDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters & Sorting
  const [selectedRating, setSelectedRating] = React.useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [withPhotosOnly, setWithPhotosOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"newest" | "highest_rating" | "lowest_rating" | "most_helpful">("newest");

  // Modals
  const [writeModalOpen, setWriteModalOpen] = React.useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = React.useState<string | null>(null);
  const [reportingReviewId, setReportingReviewId] = React.useState<string | null>(null);
  const [reportReason, setReportReason] = React.useState<ReviewReportReason>(ReviewReportReason.SPAM);
  const [reportComment, setReportComment] = React.useState("");
  const [reportingSubmitting, setReportingSubmitting] = React.useState(false);
  const [reportSuccess, setReportSuccess] = React.useState(false);

  // Fetch summary
  const fetchSummary = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews/summary`);
      const data = await res.json();
      if (data.success && data.data) {
        setSummary(data.data);
      }
    } catch {
      // Graceful fallback
    }
  }, [productId]);

  // Fetch reviews list
  const fetchReviews = React.useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "10",
          sortBy,
        });

        if (selectedRating) params.append("rating", String(selectedRating));
        if (verifiedOnly) params.append("verifiedOnly", "true");
        if (withPhotosOnly) params.append("withPhotosOnly", "true");

        const res = await fetch(`/api/products/${productId}/reviews?${params.toString()}`);
        const data = await res.json();

        if (data.success && data.data) {
          setReviews((prev) => (append ? [...prev, ...data.data.reviews] : data.data.reviews));
          setTotalPages(data.data.pagination.totalPages);
          setPage(targetPage);
        }
      } catch {
        // Graceful error state
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productId, selectedRating, verifiedOnly, withPhotosOnly, sortBy]
  );

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  React.useEffect(() => {
    fetchReviews(1, false);
  }, [fetchReviews]);

  // Handle helpful vote toggle
  const handleHelpfulToggle = async (reviewId: string, currentlyVoted?: boolean) => {
    try {
      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id !== reviewId) return r;
          const nextVoted = !currentlyVoted;
          return {
            ...r,
            hasVotedHelpful: nextVoted,
            helpfulCount: nextVoted ? r.helpfulCount + 1 : Math.max(0, r.helpfulCount - 1),
          };
        })
      );

      const method = currentlyVoted ? "DELETE" : "POST";
      const res = await fetch(`/api/account/reviews/${reviewId}/helpful`, { method });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Rollback
        fetchReviews(page, false);
      }
    } catch {
      fetchReviews(page, false);
    }
  };

  // Handle submit report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReviewId) return;

    try {
      setReportingSubmitting(true);
      const res = await fetch(`/api/account/reviews/${reportingReviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          comment: reportComment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to submit report");
        return;
      }

      setReportSuccess(true);
      setTimeout(() => {
        setReportingReviewId(null);
        setReportSuccess(false);
        setReportComment("");
      }, 1500);
    } catch {
      alert("Network error reporting review");
    } finally {
      setReportingSubmitting(false);
    }
  };

  const totalReviews = summary?.ratingCount || 0;
  const avgRating = summary?.averageRating || 0;

  return (
    <section id="reviews-section" className="py-12 border-t border-border/80">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Customer Impressions</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-light uppercase tracking-wider text-foreground">
            Ratings &amp; Reviews
          </h2>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setWriteModalOpen(true)}
          className="uppercase tracking-widest text-[11px] font-semibold py-2.5 px-5"
        >
          Write a Review
        </Button>
      </div>

      {/* Rating Summary & Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-lg bg-surface border border-border/60 mb-8">
        {/* Left: Overall Score */}
        <div className="md:col-span-4 flex flex-col justify-center items-center md:items-start md:border-r md:border-border/60 md:pr-6 text-center md:text-left">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-serif font-medium text-foreground">
              {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(avgRating)
                    ? "fill-amber-400 stroke-amber-400"
                    : "stroke-neutral-300 dark:stroke-neutral-700"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {totalReviews > 0
              ? `Based on ${totalReviews} verified ${totalReviews === 1 ? "review" : "reviews"}`
              : "No reviews recorded yet"}
          </p>
        </div>

        {/* Right: Distribution Bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary?.distribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            const isFilterActive = selectedRating === stars;

            return (
              <button
                key={stars}
                onClick={() => setSelectedRating(isFilterActive ? null : stars)}
                className={`flex items-center gap-3 text-xs group w-full text-left transition-colors rounded px-2 py-0.5 ${
                  isFilterActive ? "bg-primary/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                }`}
              >
                <span className="w-12 font-mono text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <span>{stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 stroke-amber-400 inline" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-12 font-mono text-[11px] text-muted-foreground text-right shrink-0">
                  {count} ({percentage}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-border/60">
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selectedRating === null && !verifiedOnly && !withPhotosOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedRating(null);
              setVerifiedOnly(false);
              setWithPhotosOnly(false);
            }}
            className="text-[11px] font-mono h-8"
          >
            All Reviews
          </Button>

          {selectedRating && (
            <Badge
              variant="default"
              className="text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              onClick={() => setSelectedRating(null)}
            >
              <span>{selectedRating} Stars</span>
              <X className="h-3 w-3" />
            </Badge>
          )}

          <Button
            variant={withPhotosOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => setWithPhotosOnly((prev) => !prev)}
            className="text-[11px] font-mono h-8 flex items-center gap-1.5"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>With Photos ({summary?.withPhotosCount || 0})</span>
          </Button>

          <Button
            variant={verifiedOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => setVerifiedOnly((prev) => !prev)}
            className="text-[11px] font-mono h-8 flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified Buyers ({summary?.verifiedPurchaseCount || 0})</span>
          </Button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-background border border-border rounded px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Sort reviews"
          >
            <option value="newest">Most Recent</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="lowest_rating">Lowest Rating</option>
            <option value="most_helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner size="md" />
          <p className="text-xs font-mono">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-lg border border-dashed border-border/80 bg-surface/50">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <h3 className="font-serif text-base text-foreground uppercase tracking-wider">
            No Reviews Match Your Selection
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {totalReviews === 0
              ? "Be the first to review this atelier silhouette."
              : "Try adjusting your filters to see more customer impressions."}
          </p>
          {totalReviews === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWriteModalOpen(true)}
              className="mt-2 text-xs font-mono"
            >
              Write First Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="p-5 sm:p-6 rounded-lg bg-surface border border-border/60 space-y-3.5 transition-all hover:border-border"
            >
              {/* Review Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= review.rating
                            ? "fill-amber-400 stroke-amber-400"
                            : "stroke-neutral-300 dark:stroke-neutral-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Headline */}
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                    {review.title}
                  </h4>
                </div>

                {/* Published Date */}
                <time className="text-[11px] font-mono text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              {/* Verified Author & Garment Context Line */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{review.customerDisplayName}</span>

                {review.isVerifiedPurchase && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Verified Purchase</span>
                  </Badge>
                )}

                {review.variantSnapshot && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {review.variantSnapshot.size ? `Size: ${review.variantSnapshot.size}` : ""}
                    {review.variantSnapshot.color ? ` • Color: ${review.variantSnapshot.color}` : ""}
                  </span>
                )}
              </div>

              {/* Review Text Body */}
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {review.comment}
              </p>

              {/* Review Media Thumbnails */}
              {review.media && review.media.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {review.media.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveLightboxImage(m.url)}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden border border-border hover:opacity-90 hover:scale-105 transition-all bg-neutral-100 dark:bg-neutral-800 focus:outline-none"
                    >
                      <img
                        src={m.url}
                        alt={`${review.title} - photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Review Actions Footer: Helpful Vote & Flag */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => handleHelpfulToggle(review.id, review.hasVotedHelpful)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    review.hasVotedHelpful
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  aria-label="Mark review as helpful"
                >
                  <ThumbsUp className={`h-3 w-3 ${review.hasVotedHelpful ? "fill-current" : ""}`} />
                  <span>Helpful ({review.helpfulCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportingReviewId(review.id)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-rose-600 flex items-center gap-1 transition-colors"
                  aria-label="Report review"
                >
                  <Flag className="h-3 w-3" />
                  <span>Report</span>
                </button>
              </div>
            </article>
          ))}

          {/* Pagination: Load More */}
          {page < totalPages && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReviews(page + 1, true)}
                disabled={loadingMore}
                className="font-mono text-xs px-6"
              >
                {loadingMore ? "Loading..." : "Load More Reviews"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeLightboxImage}
              alt="Review full photo"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Report Review Modal */}
      {reportingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-lg bg-surface border border-border p-6 shadow-2xl">
            <button
              onClick={() => setReportingReviewId(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-serif text-lg text-foreground uppercase tracking-wide mb-1">
              Report Review
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Help us maintain an authentic and respectful community.
            </p>

            {reportSuccess ? (
              <div className="py-6 text-center text-emerald-600 dark:text-emerald-400 space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <p className="text-xs font-mono">Thank you. Your report has been submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Reason *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReviewReportReason)}
                    className="w-full text-xs bg-background border border-border rounded p-2 font-mono focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value={ReviewReportReason.SPAM}>Spam or promotional content</option>
                    <option value={ReviewReportReason.OFFENSIVE}>Offensive or abusive language</option>
                    <option value={ReviewReportReason.FAKE_REVIEW}>Suspected fake or incentivized review</option>
                    <option value={ReviewReportReason.IRRELEVANT}>Irrelevant to product</option>
                    <option value={ReviewReportReason.HARASSMENT}>Harassment or personal attack</option>
                    <option value={ReviewReportReason.OTHER}>Other policy violation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    placeholder="Provide additional details for our moderation team..."
                    rows={3}
                    maxLength={500}
                    className="w-full text-xs bg-background border border-border rounded p-2 focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportingReviewId(null)}
                    disabled={reportingSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={reportingSubmitting}>
                    {reportingSubmitting ? "Submitting..." : "Submit Report"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        productId={productId}
        productName={productName}
        productImage={productImage}
        isOpen={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
        onSuccess={() => {
          fetchSummary();
          fetchReviews(1, false);
        }}
      />
    </section>
  );
}
