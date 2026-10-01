import { Schema } from "mongoose";
import {
  RefundStatus,
  RefundType,
  RefundSourceType,
  RefundAttemptStatus,
} from "@/constants/status";
import { IRefund } from "@/types/database";

const RefundCalculationItemSnapshotSchema = new Schema(
  {
    orderItemId: { type: String, required: true },
    variantId: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discountAllocation: { type: Number, default: 0 },
    taxAllocation: { type: Number, default: 0 },
    itemRefundAmount: { type: Number, required: true },
  },
  { _id: false }
);

const RefundCalculationSnapshotSchema = new Schema(
  {
    originalSubtotal: { type: Number, required: true },
    originalDiscount: { type: Number, default: 0 },
    originalCouponDiscount: { type: Number, default: 0 },
    originalTax: { type: Number, default: 0 },
    originalShipping: { type: Number, default: 0 },
    originalTotal: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    previouslyRefundedAmount: { type: Number, default: 0 },
    remainingRefundableBefore: { type: Number, required: true },
    itemsRefundSubtotal: { type: Number, default: 0 },
    discountDeduction: { type: Number, default: 0 },
    taxRefund: { type: Number, default: 0 },
    shippingRefund: { type: Number, default: 0 },
    finalRefundAmount: { type: Number, required: true },
    policyNotes: { type: String },
    items: [RefundCalculationItemSnapshotSchema],
  },
  { _id: false }
);

const RefundAttemptSchema = new Schema(
  {
    attemptId: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true, index: true },
    providerRequestId: { type: String, trim: true },
    providerRefundId: { type: String, trim: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Attempt amount must be integer minor units",
      },
    },
    currency: { type: String, required: true, default: "INR" },
    status: {
      type: String,
      enum: Object.values(RefundAttemptStatus),
      default: RefundAttemptStatus.INITIATED,
      required: true,
    },
    errorCode: { type: String, trim: true },
    errorMessage: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { _id: false }
);

export const RefundSchema = new Schema(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    returnRequestId: {
      type: Schema.Types.ObjectId,
      ref: "ReturnRequest",
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Refund amount must be an integer minor unit (e.g., paise)",
      },
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(RefundType),
      default: RefundType.RETURN,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(RefundSourceType),
      default: RefundSourceType.RETURN,
      required: true,
      index: true,
    },
    sourceId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.REQUESTED,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: "razorpay",
      trim: true,
      index: true,
    },
    providerRefundId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    initiatedBy: {
      type: String,
      required: true,
      trim: true,
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    calculationSnapshot: {
      type: RefundCalculationSnapshotSchema,
    },
    attempts: {
      type: [RefundAttemptSchema],
      default: [],
    },
    reconciliationState: {
      lastCheckedAt: { type: Date },
      providerStatus: { type: String, trim: true },
      mismatchDetected: { type: Boolean, default: false },
      notes: { type: String, trim: true },
    },
    initiatedAt: {
      type: Date,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureCode: {
      type: String,
      trim: true,
    },
    failureMessage: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "refunds",
  }
);

RefundSchema.index({ orderId: 1, status: 1 });
RefundSchema.index({ customerId: 1, createdAt: -1 });
RefundSchema.index({ provider: 1, providerRefundId: 1 }, { sparse: true });
RefundSchema.index({ sourceType: 1, sourceId: 1 }, { sparse: true });
RefundSchema.index({ status: 1, createdAt: -1 });
