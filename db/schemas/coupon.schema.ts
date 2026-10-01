import { Schema } from "mongoose";
import { DiscountType } from "@/constants/status";
import { ICoupon } from "@/types/database";

export const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [1, "Coupon value must be positive"],
    },
    minCartValue: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "minCartValue must be an integer minor unit (e.g., paise)",
      },
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (val: number | null | undefined) => val == null || Number.isInteger(val),
        message: "maxDiscountAmount must be an integer minor unit (e.g., paise)",
      },
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    perCustomerUsageLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    applicableProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableBrandIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Brand",
      },
    ],
    excludedProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludedCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    stackable: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "coupons",
  }
);
