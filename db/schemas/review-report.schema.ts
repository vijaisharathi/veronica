import { Schema } from "mongoose";
import { ReviewReportReason, ReviewReportStatus } from "@/constants/status";
import { IReviewReport } from "@/types/database";

export const ReviewReportSchema = new Schema<IReviewReport>(
  {
    reviewId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: "Review",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: "Customer",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReviewReportReason),
      required: true,
      index: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(ReviewReportStatus),
      default: ReviewReportStatus.PENDING,
      required: true,
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: "Staff",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "review_reports",
  }
);

// One report per customer per review to eliminate spamming
ReviewReportSchema.index({ reviewId: 1, customerId: 1 }, { unique: true });
ReviewReportSchema.index({ status: 1, createdAt: -1 });
