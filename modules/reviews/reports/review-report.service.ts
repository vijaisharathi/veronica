/**
 * VÉRONA — Review Abuse Reporting & Resolution Service (Phase 24)
 *
 * Governs customer flagging of inappropriate reviews, spam deduplication,
 * and administrator dispute resolution workflows.
 */

import { ReviewReportModel, ReviewModel } from "@/db/models";
import { ReviewReportReason, ReviewReportStatus, ReviewStatus } from "@/constants/status";
import { CreateReportInput, ResolveReportInput } from "../types/review.types";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { reviewAggregationService } from "../aggregation/review-aggregation.service";
import { logger } from "@/lib/logger";

export class ReviewReportService {
  /**
   * Submits a customer abuse report against a review.
   */
  async submitReport(
    reviewId: string,
    customerId: string,
    input: CreateReportInput
  ): Promise<{ reportId: string; status: ReviewReportStatus }> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    if (review.customerId.toString() === customerId.toString()) {
      throw new ValidationError("You cannot report your own review");
    }

    try {
      const report = await ReviewReportModel.create({
        reviewId,
        customerId,
        reason: input.reason,
        comment: input.comment,
        status: ReviewReportStatus.PENDING,
      });

      // Atomically increment review report count
      await ReviewModel.findByIdAndUpdate(reviewId, {
        $inc: { reportCount: 1 },
      });

      logger.info("Review reported by customer", {
        context: "ReviewReportService",
        metadata: { reviewId, customerId, reason: input.reason },
      });

      return {
        reportId: report._id.toString(),
        status: report.status,
      };
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        throw new ConflictError("You have already reported this review");
      }
      throw err;
    }
  }

  /**
   * Resolves a review report (Staff/Admin action).
   */
  async resolveReport(
    reportId: string,
    staffId: string,
    input: ResolveReportInput
  ): Promise<{ reportId: string; status: ReviewReportStatus }> {
    const report = await ReviewReportModel.findById(reportId);
    if (!report) {
      throw new NotFoundError("ReviewReport", reportId);
    }

    report.status = input.status;
    report.resolvedBy = staffId;
    report.resolvedAt = new Date();
    if (input.resolutionNotes) {
      report.resolutionNotes = input.resolutionNotes;
    }
    await report.save();

    // If moderator elected to hide the review as part of resolution:
    if (input.actionTaken === "HIDE_REVIEW") {
      const review = await ReviewModel.findById(report.reviewId);
      if (review && review.status === ReviewStatus.PUBLISHED) {
        review.status = ReviewStatus.HIDDEN;
        review.moderationReason = `Hidden via report resolution: ${report.reason}`;
        review.moderatorNotes = input.resolutionNotes || "Actioned via report queue";
        await review.save();

        await reviewAggregationService.handleReviewUnpublished(review.productId.toString());
      }
    }

    logger.info("Review report resolved by staff", {
      context: "ReviewReportService",
      metadata: { reportId, staffId, status: input.status, actionTaken: input.actionTaken },
    });

    return {
      reportId: report._id.toString(),
      status: report.status,
    };
  }

  /**
   * Retrieves active pending reports for admin moderation queue.
   */
  async findReportsAdmin(options: { status?: ReviewReportStatus; page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options.status) {
      filter.status = options.status;
    }

    const [reports, total] = await Promise.all([
      ReviewReportModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReviewReportModel.countDocuments(filter),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const reviewReportService = new ReviewReportService();
