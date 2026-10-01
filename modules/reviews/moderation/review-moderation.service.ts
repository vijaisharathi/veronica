/**
 * VÉRONA — Review Moderation Service (Phase 24)
 *
 * Implements administrator moderation workflows:
 * - Review approval / publishing
 * - Rejection with structured policy reasons
 * - Hiding published reviews
 * - Restoring hidden reviews
 * - Concurrency-safe aggregate synchronization
 * - Audit trail logging
 */

import { ReviewModel, AuditLogModel } from "@/db/models";
import { ReviewStatus, ReviewModerationReason, AuditActorType } from "@/constants/status";
import { ReviewStateMachine } from "../state-machine/review-state-machine";
import { reviewAggregationService } from "../aggregation/review-aggregation.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { IReview, IStaff } from "@/types/database";
import { logger } from "@/lib/logger";

export class ReviewModerationService {
  /**
   * Publishes a pending, hidden, or reconsidered review.
   */
  async publishReview(
    reviewId: string,
    staff: IStaff,
    notes?: string
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    const previousStatus = review.status;
    ReviewStateMachine.assertCanTransition(previousStatus, ReviewStatus.PUBLISHED);

    review.status = ReviewStatus.PUBLISHED;
    review.publishedAt = new Date();
    if (notes) {
      review.moderatorNotes = notes;
    }
    await review.save();

    // Synchronize rating aggregate
    await reviewAggregationService.handleReviewPublished(review.productId.toString());

    // Audit log
    await this.logModerationAudit({
      staffId: staff._id.toString(),
      action: "REVIEW_PUBLISHED",
      reviewId,
      previousStatus,
      newStatus: ReviewStatus.PUBLISHED,
      notes,
    });

    logger.info("Review published by staff", {
      context: "ReviewModerationService",
      metadata: { reviewId, staffId: staff._id.toString(), previousStatus },
    });

    return review.toObject() as unknown as IReview;
  }

  /**
   * Rejects a pending review with structured reason code.
   */
  async rejectReview(
    reviewId: string,
    staff: IStaff,
    reason: ReviewModerationReason | string,
    notes?: string
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    const previousStatus = review.status;
    ReviewStateMachine.assertCanTransition(previousStatus, ReviewStatus.REJECTED);

    review.status = ReviewStatus.REJECTED;
    review.moderationReason = reason;
    if (notes) {
      review.moderatorNotes = notes;
    }
    await review.save();

    // If it was previously published, remove from aggregates
    if (ReviewStateMachine.contributesToAggregates(previousStatus)) {
      await reviewAggregationService.handleReviewUnpublished(review.productId.toString());
    }

    // Audit log
    await this.logModerationAudit({
      staffId: staff._id.toString(),
      action: "REVIEW_REJECTED",
      reviewId,
      previousStatus,
      newStatus: ReviewStatus.REJECTED,
      reason,
      notes,
    });

    logger.info("Review rejected by staff", {
      context: "ReviewModerationService",
      metadata: { reviewId, staffId: staff._id.toString(), reason },
    });

    return review.toObject() as unknown as IReview;
  }

  /**
   * Hides a published review (e.g., following abuse report or investigation).
   */
  async hideReview(
    reviewId: string,
    staff: IStaff,
    reason: ReviewModerationReason | string,
    notes?: string
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    const previousStatus = review.status;
    ReviewStateMachine.assertCanTransition(previousStatus, ReviewStatus.HIDDEN);

    review.status = ReviewStatus.HIDDEN;
    review.moderationReason = reason;
    if (notes) {
      review.moderatorNotes = notes;
    }
    await review.save();

    // Remove from public aggregate
    await reviewAggregationService.handleReviewUnpublished(review.productId.toString());

    // Audit log
    await this.logModerationAudit({
      staffId: staff._id.toString(),
      action: "REVIEW_HIDDEN",
      reviewId,
      previousStatus,
      newStatus: ReviewStatus.HIDDEN,
      reason,
      notes,
    });

    logger.info("Review hidden by staff", {
      context: "ReviewModerationService",
      metadata: { reviewId, staffId: staff._id.toString(), reason },
    });

    return review.toObject() as unknown as IReview;
  }

  /**
   * Restores a hidden review back to PUBLISHED.
   */
  async restoreReview(
    reviewId: string,
    staff: IStaff,
    notes?: string
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    const previousStatus = review.status;
    ReviewStateMachine.assertCanTransition(previousStatus, ReviewStatus.PUBLISHED);

    review.status = ReviewStatus.PUBLISHED;
    review.moderationReason = undefined;
    if (notes) {
      review.moderatorNotes = notes;
    }
    await review.save();

    // Re-add to public aggregate
    await reviewAggregationService.handleReviewPublished(review.productId.toString());

    // Audit log
    await this.logModerationAudit({
      staffId: staff._id.toString(),
      action: "REVIEW_RESTORED",
      reviewId,
      previousStatus,
      newStatus: ReviewStatus.PUBLISHED,
      notes,
    });

    logger.info("Review restored to published by staff", {
      context: "ReviewModerationService",
      metadata: { reviewId, staffId: staff._id.toString() },
    });

    return review.toObject() as unknown as IReview;
  }

  private async logModerationAudit(params: {
    staffId: string;
    action: string;
    reviewId: string;
    previousStatus: ReviewStatus;
    newStatus: ReviewStatus;
    reason?: string;
    notes?: string;
  }) {
    try {
      await AuditLogModel.create({
        actorId: params.staffId,
        actorType: AuditActorType.STAFF,
        action: params.action,
        entityType: "Review",
        entityId: params.reviewId,
        before: { status: params.previousStatus },
        after: { status: params.newStatus },
        metadata: {
          reason: params.reason,
          notes: params.notes,
        },
      });
    } catch (err) {
      logger.warn("Failed to create review moderation audit log", {
        context: "ReviewModerationService",
        metadata: { error: String(err) },
      });
    }
  }
}

export const reviewModerationService = new ReviewModerationService();
