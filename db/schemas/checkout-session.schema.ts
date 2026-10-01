import { Schema } from "mongoose";
import { CheckoutSessionStatus } from "@/constants/status";
import { ICheckoutSession } from "@/types/database";

const CheckoutAddressSnapshotSchema = new Schema(
  {
    addressId: { type: Schema.Types.ObjectId, ref: "Address" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
  },
  { _id: false }
);

const CheckoutServiceabilitySnapshotSchema = new Schema(
  {
    postalCode: { type: String, required: true, trim: true },
    serviceable: { type: Boolean, required: true },
    state: { type: String, required: true },
    city: { type: String, trim: true },
    stateName: { type: String, trim: true },
    estimatedDeliveryDays: { type: Number },
    reason: { type: String, trim: true },
    source: { type: String, required: true },
    checkedAt: { type: String, required: true },
  },
  { _id: false }
);

const CheckoutPricingSnapshotSchema = new Schema(
  {
    subtotalMinor: { type: Number, required: true, min: 0 },
    promotionDiscountMinor: { type: Number, required: true, min: 0, default: 0 },
    couponDiscountMinor: { type: Number, required: true, min: 0, default: 0 },
    totalDiscountMinor: { type: Number, required: true, min: 0, default: 0 },
    amountDueBeforePaymentMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "INR" },
    pricingVersion: { type: String, required: true },
    calculatedAt: { type: String, required: true },
  },
  { _id: false }
);

export const CheckoutSessionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    selectedAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    status: {
      type: String,
      enum: Object.values(CheckoutSessionStatus),
      default: CheckoutSessionStatus.ACTIVE,
      required: true,
      index: true,
    },
    addressSnapshot: CheckoutAddressSnapshotSchema,
    serviceabilitySnapshot: CheckoutServiceabilitySnapshotSchema,
    pricingSnapshot: {
      type: CheckoutPricingSnapshotSchema,
      required: true,
    },
    appliedCouponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "checkout_sessions",
  }
);

CheckoutSessionSchema.index({ customerId: 1, status: 1 });
