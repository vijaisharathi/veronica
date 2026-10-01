"use client";

import * as React from "react";
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReviewEligibilityResult } from "@/modules/reviews/types/review.types";

interface WriteReviewModalProps {
  productId: string;
  productName: string;
  productImage?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WriteReviewModal({
  productId,
  productName,
  productImage: _productImage,
  isOpen,
  onClose,
  onSuccess,
}: WriteReviewModalProps) {
  const [eligibility, setEligibility] = React.useState<ReviewEligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Form State
  const [rating, setRating] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);
  const [mediaInput, setMediaInput] = React.useState("");

  // Check eligibility on mount
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCheckingEligibility(true);
    setError(null);
    setSuccess(false);

    fetch(`/api/account/reviews/eligibility?productId=${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setEligibility(data.data);
        } else {
          setEligibility({
            isEligible: false,
            alreadyReviewed: false,
            ineligibleReason: data.error?.message || "Eligibility check failed",
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setEligibility({
          isEligible: false,
          alreadyReviewed: false,
          ineligibleReason: "Unable to verify purchase history. Please ensure you are logged in.",
        });
      })
      .finally(() => {
        if (isMounted) setCheckingEligibility(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const handleAddMedia = () => {
    const trimmed = mediaInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith("https://")) {
      setError("Please provide a secure image URL starting with https://");
      return;
    }

    if (mediaUrls.length >= 5) {
      setError("Maximum 5 photos are allowed per review");
      return;
    }

    setMediaUrls((prev) => [...prev, trimmed]);
    setMediaInput("");
    setError(null);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility?.isEligible) return;

    if (!title.trim() || title.length < 2) {
      setError("Please provide a headline of at least 2 characters.");
      return;
    }

    if (!comment.trim() || comment.length < 10) {
      setError("Please provide review feedback of at least 10 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          orderId: eligibility.orderId,
          orderItemId: eligibility.orderItemId,
          variantId: eligibility.variantId,
          media: mediaUrls.map((url, idx) => ({
            url,
            mediaType: "IMAGE",
            sortOrder: idx,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit review");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Verified Atelier Review</span>
          </div>
          <h2 className="text-xl font-serif font-light text-foreground uppercase tracking-wide">
            Review Silhouette
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{productName}</p>
        </div>

        {checkingEligibility ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Spinner size="md" />
            <p className="text-xs font-mono">Verifying purchase eligibility...</p>
          </div>
        ) : success ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-12 w-12" />
            <h3 className="font-serif text-lg text-foreground uppercase tracking-wide">
              Review Published
            </h3>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Thank you for sharing your artisanal perspective with the VÉRONA community.
            </p>
          </div>
        ) : !eligibility?.isEligible ? (
          <div className="py-8 space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  {eligibility?.alreadyReviewed
                    ? "You Have Already Reviewed This Garment"
                    : "Verified Purchase Required"}
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  {eligibility?.ineligibleReason ||
                    "To maintain uncompromising authenticity, VÉRONA only accepts reviews from customers with delivered orders for this piece."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              {eligibility?.alreadyReviewed ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    window.location.href = "/account/reviews";
                  }}
                >
                  Manage My Reviews
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    window.location.href = "/account/orders";
                  }}
                >
                  View My Orders
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Purchase Verification Callout */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                  Verified Purchase: Order #{eligibility.orderNumber}
                </span>
              </div>
              {eligibility.variantSnapshot?.size && (
                <span className="font-mono text-[10px] text-emerald-800 dark:text-emerald-300">
                  Size: {eligibility.variantSnapshot.size}
                  {eligibility.variantSnapshot.color ? ` • ${eligibility.variantSnapshot.color}` : ""}
                </span>
              )}
            </div>

            {/* Star Rating Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Overall Rating *
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating !== null ? hoverRating : rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          filled
                            ? "fill-amber-400 stroke-amber-400"
                            : "stroke-neutral-300 dark:stroke-neutral-700"
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-mono font-medium text-foreground">
                  {rating === 5
                    ? "Flawless — 5 Stars"
                    : rating === 4
                    ? "Great — 4 Stars"
                    : rating === 3
                    ? "Average — 3 Stars"
                    : rating === 2
                    ? "Subpar — 2 Stars"
                    : "Disappointing — 1 Star"}
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Review Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exceptional drape, impeccable Italian tailoring"
                maxLength={120}
                required
                className="w-full px-3 py-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Review Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Detailed Impressions *
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {comment.length} / 2,000
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the fabric texture, silhouette drape, sizing accuracy, and styling versatility..."
                rows={4}
                maxLength={2000}
                required
                className="w-full px-3 py-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Media Upload / Photo URLs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Photos (Optional — Max 5)
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {mediaUrls.length}/5 photos
                </span>
              </div>

              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {mediaUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded overflow-hidden border border-border group bg-neutral-100 dark:bg-neutral-800"
                    >
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {mediaUrls.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={mediaInput}
                    onChange={(e) => setMediaInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                    className="flex-1 px-3 py-1.5 text-xs rounded border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMedia}
                    disabled={!mediaInput.trim()}
                  >
                    Add Photo
                  </Button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Publishing..." : "Submit Review"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
