/**
 * VÉRONA — Review Helpful Voting Service (Phase 24)
 *
 * Implements idempotent helpful voting:
 * - One vote per customer per review enforced via MongoDB unique index
 * - Prevents review authors from upvoting their own reviews
 * - Atomic $inc of helpfulCount on review documents
 * - Batch queries to avoid N+1 queries when rendering product review lists
 */

import { ReviewVoteModel, ReviewModel } from "@/db/models";
import { NotFoundError, ValidationError } from "@/lib/errors";

export class ReviewVoteService {
  /**
   * Adds a helpful vote to a review.
   * Idempotent: If already voted, does not double-count.
   */
  async voteHelpful(
    reviewId: string,
    customerId: string
  ): Promise<{ helpfulCount: number; hasVoted: boolean }> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    if (review.customerId.toString() === customerId.toString()) {
      throw new ValidationError("Authors cannot vote on their own reviews");
    }

    try {
      // Attempt to insert vote record. Unique index on { reviewId, customerId } prevents duplicate.
      await ReviewVoteModel.create({
        reviewId,
        customerId,
      });

      // Atomically increment helpful count
      const updated = await ReviewModel.findByIdAndUpdate(
        reviewId,
        { $inc: { helpfulCount: 1 } },
        { new: true }
      );

      return {
        helpfulCount: updated?.helpfulCount || review.helpfulCount + 1,
        hasVoted: true,
      };
    } catch (err: unknown) {
      // Duplicate key error (E11000) indicates user already voted
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        return {
          helpfulCount: review.helpfulCount,
          hasVoted: true,
        };
      }
      throw err;
    }
  }

  /**
   * Removes a helpful vote (toggle off).
   */
  async removeHelpful(
    reviewId: string,
    customerId: string
  ): Promise<{ helpfulCount: number; hasVoted: boolean }> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    const deleteResult = await ReviewVoteModel.deleteOne({
      reviewId,
      customerId,
    });

    if (deleteResult.deletedCount > 0) {
      const updated = await ReviewModel.findByIdAndUpdate(
        reviewId,
        { $inc: { helpfulCount: -1 } },
        { new: true }
      );

      return {
        helpfulCount: Math.max(0, updated?.helpfulCount || 0),
        hasVoted: false,
      };
    }

    return {
      helpfulCount: review.helpfulCount,
      hasVoted: false,
    };
  }

  /**
   * Checks whether a customer has voted helpful on a specific review.
   */
  async hasCustomerVoted(reviewId: string, customerId: string): Promise<boolean> {
    const vote = await ReviewVoteModel.exists({ reviewId, customerId });
    return Boolean(vote);
  }

  /**
   * Batch checks which reviews in a list the customer has voted helpful on.
   * Prevents N+1 database roundtrips.
   */
  async getCustomerVotedReviewIds(
    reviewIds: string[],
    customerId?: string
  ): Promise<Set<string>> {
    if (!customerId || reviewIds.length === 0) {
      return new Set();
    }

    const votes = await ReviewVoteModel.find({
      reviewId: { $in: reviewIds },
      customerId,
    })
      .select("reviewId")
      .lean();

    return new Set(votes.map((v) => v.reviewId.toString()));
  }
}

export const reviewVoteService = new ReviewVoteService();
