import { Schema } from "mongoose";
import { ReviewStatus } from "@/constants/status";
import { IReview } from "@/types/database";

const ReviewMediaSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    mediaType: { type: String, enum: ["IMAGE", "VIDEO"], default: "IMAGE", required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

export const ReviewSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderItemId: {
      type: String,
      trim: true,
      default: null,
    },
    variantId: {
      type: String,
      trim: true,
      default: null,
    },
    variantSnapshot: {
      color: { type: String, trim: true },
      size: { type: String, trim: true },
      sku: { type: String, trim: true },
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    media: [ReviewMediaSchema],
    verifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
      required: true,
      index: true,
    },
    moderationReason: {
      type: String,
      trim: true,
    },
    moderatorNotes: {
      type: String,
      trim: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    customerDisplayName: {
      type: String,
      trim: true,
      default: "Verified Customer",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "reviews",
  }
);

// Prevent duplicate active reviews by the same customer on the same product
ReviewSchema.index({ customerId: 1, productId: 1, orderItemId: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ productId: 1, status: 1, rating: -1 });
ReviewSchema.index({ productId: 1, status: 1, helpfulCount: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, reportCount: -1 });
