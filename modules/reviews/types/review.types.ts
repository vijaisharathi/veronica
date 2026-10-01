/**
 * VÉRONA — Reviews & Ratings Domain Types & DTO Definitions (Phase 24)
 *
 * Defines strongly-typed DTOs, query contracts, eligibility models,
 * summary aggregates, and moderation structures.
 */

import {
  ReviewStatus,
  ReviewReportReason,
  ReviewReportStatus,
  ReviewModerationReason,
} from "@/constants/status";
import { IReviewMedia, IReviewVariantSnapshot } from "@/types/database";

// ── Public DTOs (Safe for public storefront rendering) ─────────────────────────

export interface ReviewPublicDTO {
  id: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  customerDisplayName: string;
  isVerifiedPurchase: boolean;
  variantSnapshot?: IReviewVariantSnapshot;
  media: IReviewMedia[];
  helpfulCount: number;
  hasVotedHelpful?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummaryDTO {
  productId: string;
  averageRating: number;
  ratingCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
  withPhotosCount: number;
}

// ── Customer DTOs (Personal account context) ───────────────────────────────────

export interface ReviewCustomerDTO extends ReviewPublicDTO {
  status: ReviewStatus;
  moderationReason?: string;
  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;
  editable: boolean;
  deletable: boolean;
}

// ── Admin DTOs (Operational moderation context) ────────────────────────────────

export interface ReviewReportDTO {
  id: string;
  reviewId: string;
  customerId: string;
  reason: ReviewReportReason;
  comment?: string;
  status: ReviewReportStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface ReviewAdminDTO {
  id: string;
  customerId: string;
  customerDisplayName: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;
  variantId?: string;
  variantSnapshot?: IReviewVariantSnapshot;
  rating: number;
  title: string;
  comment: string;
  media: IReviewMedia[];
  verifiedPurchase: boolean;
  verifiedAt?: string;
  status: ReviewStatus;
  moderationReason?: string;
  moderatorNotes?: string;
  helpfulCount: number;
  reportCount: number;
  reports?: ReviewReportDTO[];
  publishedAt?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Eligibility Result ────────────────────────────────────────────────────────

export interface ReviewEligibilityResult {
  isEligible: boolean;
  ineligibleReason?: string;
  alreadyReviewed: boolean;
  existingReviewId?: string;
  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;
  variantId?: string;
  variantSnapshot?: IReviewVariantSnapshot;
  deliveredAt?: string;
}

// ── Input Payloads ────────────────────────────────────────────────────────────

export interface CreateReviewInput {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  orderId?: string;
  orderItemId?: string;
  variantId?: string;
  media?: Array<{
    url: string;
    mediaType?: "IMAGE" | "VIDEO";
    sortOrder?: number;
  }>;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  comment?: string;
  media?: Array<{
    url: string;
    mediaType?: "IMAGE" | "VIDEO";
    sortOrder?: number;
  }>;
}

export interface CreateReportInput {
  reason: ReviewReportReason;
  comment?: string;
}

export interface ModerateReviewInput {
  status: ReviewStatus;
  reason?: ReviewModerationReason | string;
  notes?: string;
}

export interface ResolveReportInput {
  status: ReviewReportStatus;
  resolutionNotes?: string;
  actionTaken?: "HIDE_REVIEW" | "DISMISS_REPORT" | "NO_ACTION";
}

// ── Query & Filter Types ──────────────────────────────────────────────────────

export interface ReviewFilterQuery {
  productId: string;
  rating?: number;
  verifiedOnly?: boolean;
  withPhotosOnly?: boolean;
  sortBy?: "newest" | "highest_rating" | "lowest_rating" | "most_helpful";
  page?: number;
  limit?: number;
  currentCustomerId?: string;
}

export interface AdminReviewFilterQuery {
  status?: ReviewStatus;
  rating?: number;
  productId?: string;
  customerId?: string;
  reportedOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
