/**
 * VÉRONA — Review Domain Service Orchestrator (Phase 24)
 *
 * Primary facade for customer reviews:
 * - Verified purchase validation & submission
 * - Customer review updates & soft-deletion
 * - Public review rendering with masked display names
 * - Helpful votes batch integration
 * - Event emission for future Phase 25 notifications
 */

import { ReviewModel, CustomerModel } from "@/db/models";
import { ReviewStatus } from "@/constants/status";
import { reviewRepository } from "../repositories/review.repository";
import { reviewEligibilityService } from "../eligibility/review-eligibility.service";
import { reviewAggregationService } from "../aggregation/review-aggregation.service";
import { reviewMediaService } from "../media/review-media.service";
import { reviewVoteService } from "../votes/review-vote.service";
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilterQuery,
  ReviewPublicDTO,
  ReviewCustomerDTO,
  ReviewSummaryDTO,
} from "../types/review.types";
import { IReview, ICustomer } from "@/types/database";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class ReviewService {
  /**
   * Masks a customer's real name for public privacy protection.
   * Example: "Elena Rostova" -> "Elena R."
   */
  formatMaskedCustomerName(customer?: Partial<ICustomer> | null): string {
    if (!customer) return "Verified Buyer";
    const first = (customer.firstName || "").trim();
    const last = (customer.lastName || "").trim();

    if (!first) return "Verified Buyer";
    if (!last) return first;

    return `${first} ${last.charAt(0).toUpperCase()}.`;
  }

  /**
   * Submits a new review with server-verified purchase authorization.
   */
  async createReview(
    customerId: string,
    input: CreateReviewInput
  ): Promise<IReview> {
    // 1. Verify eligibility (Customer -> Delivered Order -> Order Item -> Product)
    const eligibility = await reviewEligibilityService.assertCanReview(
      customerId,
      input.productId,
      input.orderId,
      input.orderItemId
    );

    // 2. Validate media
    const validatedMedia = reviewMediaService.validateMedia(input.media);

    // 3. Fetch customer for privacy-masked display name
    const customer = await CustomerModel.findById(customerId).lean();
    const customerDisplayName = this.formatMaskedCustomerName(customer);

    // 4. Determine initial status
    // Policy: Verified purchases from delivered orders auto-publish immediately.
    const initialStatus = ReviewStatus.PUBLISHED;

    // 5. Create immutable review record
    const review = await reviewRepository.create({
      customerId,
      productId: input.productId,
      orderId: eligibility.orderId,
      orderItemId: eligibility.orderItemId,
      variantId: eligibility.variantId || input.variantId,
      variantSnapshot: eligibility.variantSnapshot,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      media: validatedMedia,
      verifiedPurchase: true,
      verifiedAt: new Date(),
      status: initialStatus,
      customerDisplayName,
      publishedAt: initialStatus === ReviewStatus.PUBLISHED ? new Date() : undefined,
      helpfulCount: 0,
      reportCount: 0,
    });

    // 6. If auto-published, update rating aggregates
    if (initialStatus === ReviewStatus.PUBLISHED) {
      await reviewAggregationService.handleReviewPublished(input.productId);
    }

    logger.info("Review submitted and registered", {
      context: "ReviewService",
      metadata: {
        reviewId: review._id.toString(),
        productId: input.productId,
        customerId,
        rating: input.rating,
        status: initialStatus,
      },
    });

    return review;
  }

  /**
   * Customer edits their existing review.
   */
  async updateReview(
    reviewId: string,
    customerId: string,
    input: UpdateReviewInput
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    // Enforce strict customer ownership (Anti-IDOR)
    if (review.customerId.toString() !== customerId.toString()) {
      throw new ForbiddenError("You cannot modify another customer's review");
    }

    if (review.status === ReviewStatus.DELETED) {
      throw new ValidationError("Deleted reviews cannot be edited");
    }

    const previousRating = review.rating;
    let ratingChanged = false;

    if (input.rating !== undefined && input.rating !== review.rating) {
      review.rating = input.rating;
      ratingChanged = true;
    }

    if (input.title !== undefined) {
      review.title = input.title;
    }

    if (input.comment !== undefined) {
      review.comment = input.comment;
    }

    if (input.media !== undefined) {
      review.media = reviewMediaService.validateMedia(input.media);
    }

    review.editedAt = new Date();
    await review.save();

    // If published and rating changed, synchronize aggregate
    if (ratingChanged && (review.status === ReviewStatus.PUBLISHED || review.status === ReviewStatus.APPROVED)) {
      await reviewAggregationService.handleReviewRatingChanged(review.productId.toString());
    }

    logger.info("Review updated by customer", {
      context: "ReviewService",
      metadata: { reviewId, customerId, ratingChanged, previousRating, newRating: review.rating },
    });

    return review.toObject() as unknown as IReview;
  }

  /**
   * Customer soft-deletes their review.
   */
  async deleteReview(reviewId: string, customerId: string): Promise<void> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    // Anti-IDOR customer ownership assertion
    if (review.customerId.toString() !== customerId.toString()) {
      throw new ForbiddenError("You cannot delete another customer's review");
    }

    const wasPublished =
      review.status === ReviewStatus.PUBLISHED || review.status === ReviewStatus.APPROVED;

    review.status = ReviewStatus.DELETED;
    review.deletedAt = new Date();
    await review.save();

    // Deduct from public aggregates
    if (wasPublished) {
      await reviewAggregationService.handleReviewUnpublished(review.productId.toString());
    }

    logger.info("Review soft-deleted by customer", {
      context: "ReviewService",
      metadata: { reviewId, customerId, productId: review.productId.toString() },
    });
  }

  /**
   * Retrieves public, sanitized reviews for storefront display.
   */
  async getPublicReviews(
    query: ReviewFilterQuery
  ): Promise<{ reviews: ReviewPublicDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const result = await reviewRepository.findPublicReviews(query);

    const reviewIds = result.reviews.map((r) => r._id.toString());
    const votedReviewIds = await reviewVoteService.getCustomerVotedReviewIds(
      reviewIds,
      query.currentCustomerId
    );

    const publicDtos: ReviewPublicDTO[] = result.reviews.map((r) => ({
      id: r._id.toString(),
      productId: r.productId.toString(),
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      customerDisplayName: r.customerDisplayName || "Verified Buyer",
      isVerifiedPurchase: r.verifiedPurchase,
      variantSnapshot: r.variantSnapshot,
      media: r.media || [],
      helpfulCount: r.helpfulCount || 0,
      hasVotedHelpful: votedReviewIds.has(r._id.toString()),
      createdAt: (r as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (r as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    }));

    return {
      reviews: publicDtos,
      pagination: result.pagination,
    };
  }

  /**
   * Retrieves customer's personal review history.
   */
  async getCustomerReviews(
    customerId: string,
    page = 1,
    limit = 20
  ): Promise<{ reviews: ReviewCustomerDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const result = await reviewRepository.findCustomerReviews(customerId, page, limit);

    const dtos: ReviewCustomerDTO[] = result.reviews.map((r) => ({
      id: r._id.toString(),
      productId: r.productId.toString(),
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      customerDisplayName: r.customerDisplayName || "You",
      isVerifiedPurchase: r.verifiedPurchase,
      variantSnapshot: r.variantSnapshot,
      media: r.media || [],
      helpfulCount: r.helpfulCount || 0,
      status: r.status,
      moderationReason: r.moderationReason,
      orderId: r.orderId ? r.orderId.toString() : undefined,
      orderItemId: r.orderItemId,
      editable: r.status !== ReviewStatus.DELETED,
      deletable: r.status !== ReviewStatus.DELETED,
      createdAt: (r as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (r as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    }));

    return {
      reviews: dtos,
      pagination: result.pagination,
    };
  }

  /**
   * Retrieves rating summary and distribution.
   */
  async getReviewSummary(productId: string): Promise<ReviewSummaryDTO> {
    return await reviewAggregationService.getProductReviewSummary(productId);
  }
}

export const reviewService = new ReviewService();
