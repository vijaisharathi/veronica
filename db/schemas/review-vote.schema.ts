import { Schema } from "mongoose";
import { IReviewVote } from "@/types/database";

export const ReviewVoteSchema = new Schema<IReviewVote>(
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "review_votes",
  }
);

// Strictly one vote per customer per review (idempotent, race-condition protected)
ReviewVoteSchema.index({ reviewId: 1, customerId: 1 }, { unique: true });
