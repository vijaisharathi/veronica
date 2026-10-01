"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Trash2,
  EyeOff,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ReviewStatus } from "@/constants/status";
import { ReviewCustomerDTO } from "@/modules/reviews/types/review.types";

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<ReviewCustomerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingReview, setEditingReview] = useState<ReviewCustomerDTO | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState("");
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/account/reviews");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load reviews");
      }

      setReviews(data.data.reviews || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenEdit = (review: ReviewCustomerDTO) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title);
    setEditComment(review.comment);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      setSavingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/account/reviews/${editingReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          title: editTitle.trim(),
          comment: editComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update review");
      }

      setEditingReview(null);
      fetchReviews();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you wish to delete this review?")) return;

    try {
      setDeletingId(reviewId);
      const res = await fetch(`/api/account/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete review");
      }
      fetchReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ReviewStatus, reason?: string) => {
    switch (status) {
      case ReviewStatus.PUBLISHED:
      case ReviewStatus.APPROVED:
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Published</span>
          </Badge>
        );
      case ReviewStatus.PENDING:
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-mono text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            <span>Pending Moderation</span>
          </Badge>
        );
      case ReviewStatus.REJECTED:
        return (
          <Badge
            variant="destructive"
            className="text-[10px] font-mono flex items-center gap-1"
            title={reason}
          >
            <AlertCircle className="h-3 w-3" />
            <span>Rejected</span>
          </Badge>
        );
      case ReviewStatus.HIDDEN:
        return (
          <Badge
            variant="secondary"
            className="text-[10px] font-mono flex items-center gap-1"
          >
            <EyeOff className="h-3 w-3" />
            <span>Hidden</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[70vh]">
      {/* Back to Account Link */}
      <div className="mb-6">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Account</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/60 mb-8">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
            Customer Community
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-light text-foreground uppercase tracking-wide mt-1">
            My Reviews &amp; Impressions
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your verified feedback for delivered VÉRONA garments.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = "/account/orders";
          }}
          className="text-xs font-mono uppercase tracking-wider flex items-center gap-1.5"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Review Past Orders</span>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner size="lg" />
          <p className="text-xs font-mono">Loading your reviews...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-center space-y-2">
          <p className="text-xs text-red-600 dark:text-red-400 font-mono">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchReviews}>
            Retry
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center space-y-4 rounded-lg border border-dashed border-border/80 bg-surface/50">
          <Star className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-foreground uppercase tracking-wider">
              No Reviews Authored Yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Once your ordered garments are delivered to your door, you can share your feedback and sizing guidance here.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              window.location.href = "/account/orders";
            }}
            className="text-xs font-mono tracking-wider"
          >
            View My Orders
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="p-5 sm:p-6 rounded-lg bg-surface border border-border/60 space-y-4 transition-all hover:border-border"
            >
              {/* Review Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  {getStatusBadge(review.status, review.moderationReason)}

                  {review.isVerifiedPurchase && (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                      ✓ Order #{review.orderNumber || "Delivered"}
                    </span>
                  )}
                </div>

                <time className="text-[11px] font-mono text-muted-foreground">
                  Submitted on{" "}
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              {/* Rating & Headline */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= review.rating
                          ? "fill-amber-400 stroke-amber-400"
                          : "stroke-neutral-300 dark:stroke-neutral-700"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-mono font-semibold ml-1.5">
                    {review.rating}.0
                  </span>
                </div>

                <h3 className="font-serif text-base text-foreground font-medium">
                  {review.title}
                </h3>
              </div>

              {/* Body */}
              <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {review.comment}
              </p>

              {/* Media Thumbnails */}
              {review.media && review.media.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {review.media.map((m, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded overflow-hidden border border-border bg-neutral-100 dark:bg-neutral-800"
                    >
                      <img src={m.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Moderation Rejection Reason (If applicable) */}
              {review.status === ReviewStatus.REJECTED && review.moderationReason && (
                <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
                  <span className="font-semibold">Moderation Notice: </span>
                  {review.moderationReason}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Helpful Votes: <strong className="text-foreground">{review.helpfulCount}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {review.editable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(review)}
                      className="text-xs font-mono h-8 flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}

                  {review.deletable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="text-xs font-mono h-8 text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{deletingId === review.id ? "Deleting..." : "Delete"}</span>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-lg bg-surface border border-border p-6 sm:p-8 shadow-2xl">
            <h3 className="font-serif text-lg text-foreground uppercase tracking-wide mb-1">
              Edit Your Review
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Update your rating and impressions. Published aggregates will adjust immediately.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Rating */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground block">
                  Rating *
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="p-1 text-xl focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= editRating
                            ? "fill-amber-400 stroke-amber-400"
                            : "stroke-neutral-300 dark:stroke-neutral-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-mono">{editRating} Stars</span>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground block">
                  Headline *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={120}
                  required
                  className="w-full text-xs rounded border border-border bg-background p-2 font-medium focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground block">
                  Detailed Impressions *
                </label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  required
                  className="w-full text-xs rounded border border-border bg-background p-2 focus:ring-1 focus:ring-primary"
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-mono">{editError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingReview(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
