/**
 * VÉRONA — Review Aggregation Engine & Consistency Service (Phase 24)
 *
 * Maintains authoritative product rating aggregates:
 * - averageRating (0.0 to 5.0 rounded to 2 decimal places)
 * - ratingCount (total count of published reviews)
 * - distribution (1, 2, 3, 4, 5 star counts)
 * - verifiedPurchaseCount
 * - withPhotosCount
 *
 * Implements atomic updates on review lifecycle events and full deterministic reconciliation.
 */

import { ReviewModel, ProductRatingAggregateModel, ProductModel } from "@/db/models";
import { ReviewStatus } from "@/constants/status";
import { ReviewSummaryDTO } from "../types/review.types";
import { logger } from "@/lib/logger";

export class ReviewAggregationService {
  /**
   * Retrieves the current published review summary for a product.
   * If no aggregate record exists, generates a zeroed baseline summary.
   */
  async getProductReviewSummary(productId: string): Promise<ReviewSummaryDTO> {
    const aggregate = await ProductRatingAggregateModel.findOne({ productId }).lean();

    if (!aggregate) {
      return {
        productId,
        averageRating: 0,
        ratingCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchaseCount: 0,
        withPhotosCount: 0,
      };
    }

    return {
      productId,
      averageRating: aggregate.averageRating || 0,
      ratingCount: aggregate.ratingCount || 0,
      distribution: {
        1: aggregate.distribution?.[1] || 0,
        2: aggregate.distribution?.[2] || 0,
        3: aggregate.distribution?.[3] || 0,
        4: aggregate.distribution?.[4] || 0,
        5: aggregate.distribution?.[5] || 0,
      },
      verifiedPurchaseCount: aggregate.verifiedPurchaseCount || 0,
      withPhotosCount: aggregate.withPhotosCount || 0,
    };
  }

  /**
   * Deterministically calculates exact aggregates from all currently PUBLISHED reviews
   * for a product using an atomic MongoDB aggregation pipeline.
   *
   * Updates both ProductRatingAggregate and denormalized fields on Product.
   */
  async reconcileProductAggregates(productId: string): Promise<ReviewSummaryDTO> {
    const pipeline = [
      {
        $match: {
          productId: typeof productId === "string" ? { $in: [productId, new (require("mongoose").Types.ObjectId)(productId)] } : productId,
          status: { $in: [ReviewStatus.PUBLISHED, ReviewStatus.APPROVED] },
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalRatingSum: { $sum: "$rating" },
          star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          verifiedCount: { $sum: { $cond: [{ $eq: ["$verifiedPurchase", true] }, 1, 0] } },
          withPhotos: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $isArray: "$media" },
                    { $gt: [{ $size: "$media" }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const results = await ReviewModel.aggregate(pipeline);
    const data = results[0] || {
      totalCount: 0,
      totalRatingSum: 0,
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 0,
      verifiedCount: 0,
      withPhotos: 0,
    };

    const ratingCount = data.totalCount;
    const averageRating =
      ratingCount > 0
        ? Math.round((data.totalRatingSum / ratingCount) * 100) / 100
        : 0;

    const distribution = {
      1: data.star1,
      2: data.star2,
      3: data.star3,
      4: data.star4,
      5: data.star5,
    };

    // Atomically upsert ProductRatingAggregate
    await ProductRatingAggregateModel.findOneAndUpdate(
      { productId },
      {
        $set: {
          averageRating,
          ratingCount,
          distribution,
          verifiedPurchaseCount: data.verifiedCount,
          withPhotosCount: data.withPhotos,
          lastCalculatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Atomically update denormalized product rating on Product document
    await ProductModel.findByIdAndUpdate(productId, {
      $set: {
        rating: averageRating,
        ratingCount,
      },
    }).catch((err) => {
      logger.warn("Failed to denormalize rating onto Product document", {
        context: "ReviewAggregationService",
        metadata: { productId, error: String(err) },
      });
    });

    logger.info("Reconciled product review aggregates", {
      context: "ReviewAggregationService",
      metadata: { productId, averageRating, ratingCount },
    });

    return {
      productId,
      averageRating,
      ratingCount,
      distribution,
      verifiedPurchaseCount: data.verifiedCount,
      withPhotosCount: data.withPhotos,
    };
  }

  /**
   * Handles review publication event: updates aggregates.
   */
  async handleReviewPublished(productId: string): Promise<void> {
    await this.reconcileProductAggregates(productId);
  }

  /**
   * Handles review removal from public view (hidden, rejected, deleted).
   */
  async handleReviewUnpublished(productId: string): Promise<void> {
    await this.reconcileProductAggregates(productId);
  }

  /**
   * Handles review rating edit.
   */
  async handleReviewRatingChanged(productId: string): Promise<void> {
    await this.reconcileProductAggregates(productId);
  }
}

export const reviewAggregationService = new ReviewAggregationService();
