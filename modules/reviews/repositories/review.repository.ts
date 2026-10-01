/**
 * VÉRONA — Review Persistence Repository (Phase 24)
 *
 * Implements high-performance, indexed database access for customer reviews:
 * - Public paginated queries with composite index optimization
 * - Admin operational queues with multi-field search and status filtering
 * - Server-side sorting (newest, rating, helpful)
 * - Atomic lifecycle updates
 */

import { ReviewModel, ReviewReportModel } from "@/db/models";
import { ReviewStatus } from "@/constants/status";
import { IReview } from "@/types/database";
import { ReviewFilterQuery, AdminReviewFilterQuery } from "../types/review.types";

export class ReviewRepository {
  /**
   * Finds a review by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<IReview | null> {
    return (await ReviewModel.findById(id).lean()) as unknown as IReview | null;
  }

  /**
   * Finds a review by its ID with full Mongoose document methods for updates.
   */
  async findDocumentById(id: string) {
    return await ReviewModel.findById(id);
  }

  /**
   * Creates a new review document.
   */
  async create(data: Partial<IReview>): Promise<IReview> {
    const doc = await ReviewModel.create(data);
    return doc.toObject() as unknown as IReview;
  }

  /**
   * Finds active review authored by a customer for a given product.
   */
  async findActiveByCustomerAndProduct(
    customerId: string,
    productId: string
  ): Promise<IReview | null> {
    return (await ReviewModel.findOne({
      customerId,
      productId,
      status: { $ne: ReviewStatus.DELETED },
    }).lean()) as unknown as IReview | null;
  }

  /**
   * Public storefront query for published reviews for a product.
   */
  async findPublicReviews(query: ReviewFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      productId: query.productId,
      status: { $in: [ReviewStatus.PUBLISHED, ReviewStatus.APPROVED] },
    };

    if (query.rating && query.rating >= 1 && query.rating <= 5) {
      filter.rating = query.rating;
    }

    if (query.verifiedOnly) {
      filter.verifiedPurchase = true;
    }

    if (query.withPhotosOnly) {
      filter["media.0"] = { $exists: true };
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (query.sortBy === "highest_rating") {
      sort = { rating: -1, createdAt: -1 };
    } else if (query.sortBy === "lowest_rating") {
      sort = { rating: 1, createdAt: -1 };
    } else if (query.sortBy === "most_helpful") {
      sort = { helpfulCount: -1, createdAt: -1 };
    }

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments(filter),
    ]);

    return {
      reviews: reviews as unknown as IReview[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Customer account reviews query.
   */
  async findCustomerReviews(customerId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      customerId,
      status: { $ne: ReviewStatus.DELETED },
    };

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      ReviewModel.countDocuments(filter),
    ]);

    return {
      reviews: reviews as unknown as IReview[],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Admin moderation queue query with rich multi-field filters.
   */
  async findAdminReviews(query: AdminReviewFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.rating) {
      filter.rating = query.rating;
    }

    if (query.productId) {
      filter.productId = query.productId;
    }

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.reportedOnly) {
      filter.reportCount = { $gt: 0 };
    }

    if (query.search) {
      const regex = new RegExp(query.search.trim(), "i");
      filter.$or = [
        { title: regex },
        { comment: regex },
        { customerDisplayName: regex },
      ];
    }

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments(filter),
    ]);

    // Attach active reports for reported items
    const reviewIds = reviews.map((r) => r._id);
    const reports = await ReviewReportModel.find({ reviewId: { $in: reviewIds } }).lean();

    const reportMap = new Map<string, typeof reports>();
    for (const rep of reports) {
      const revId = rep.reviewId.toString();
      if (!reportMap.has(revId)) {
        reportMap.set(revId, []);
      }
      reportMap.get(revId)!.push(rep);
    }

    return {
      reviews: reviews.map((r) => ({
        ...r,
        reports: reportMap.get(r._id.toString()) || [],
      })) as unknown as (IReview & { reports: any[] })[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const reviewRepository = new ReviewRepository();
