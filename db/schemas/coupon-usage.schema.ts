import { Schema } from "mongoose";
import { ICouponUsage } from "@/types/database";

export const CouponUsageSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      sparse: true,
    },
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      sparse: true,
    },
    discountAmountMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "discountAmountMinor must be an integer minor unit (e.g., paise)",
      },
    },
    usedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "usedAt", updatedAt: false },
    collection: "coupon_usages",
  }
);

CouponUsageSchema.index({ couponId: 1, customerId: 1 });
