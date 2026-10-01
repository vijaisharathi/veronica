import { Schema } from "mongoose";
import { IRecentlyViewed } from "@/types/database";

export const RecentlyViewedSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "recently_viewed",
  }
);

RecentlyViewedSchema.index({ customerId: 1, viewedAt: -1 });
RecentlyViewedSchema.index({ sessionId: 1, viewedAt: -1 });
RecentlyViewedSchema.index({ customerId: 1, productId: 1 }, { unique: true, sparse: true });
RecentlyViewedSchema.index({ sessionId: 1, productId: 1 }, { unique: true, sparse: true });
RecentlyViewedSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
