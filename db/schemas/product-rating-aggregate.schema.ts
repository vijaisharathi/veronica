import { Schema } from "mongoose";
import { IProductRatingAggregate } from "@/types/database";

export const ProductRatingAggregateSchema = new Schema<IProductRatingAggregate>(
  {
    productId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    distribution: {
      1: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      5: { type: Number, default: 0, min: 0 },
    },
    verifiedPurchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    withPhotosCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "product_rating_aggregates",
  }
);
