import { Schema } from "mongoose";
import {
  ReturnStatus,
  ExchangeStatus,
  ReturnType,
  ReturnReason,
  InspectionResult,
  ReturnDisposition,
} from "@/constants/status";
import { IReturnRequest, IExchangeRequest } from "@/types/database";

const ReturnItemSchema = new Schema(
  {
    orderItemId: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    unitPriceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Unit price must be an integer minor unit",
      },
    },
    reason: {
      type: String,
      enum: Object.values(ReturnReason),
      required: true,
    },
    condition: {
      type: String,
      trim: true,
    },
    inspectionResult: {
      type: String,
      enum: Object.values(InspectionResult),
    },
    inspectionNotes: {
      type: String,
      trim: true,
    },
    disposition: {
      type: String,
      enum: Object.values(ReturnDisposition),
    },
  },
  { _id: false }
);

const ReturnShipmentSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true },
    providerShipmentId: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    status: { type: String, required: true, trim: true },
    scheduledPickupDate: { type: Date },
    actualPickupDate: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { _id: false, timestamps: true }
);

const ReturnPolicySnapshotSchema = new Schema(
  {
    returnWindowDays: { type: Number, required: true },
    deliveredAt: { type: Date, required: true },
    policyVersion: { type: String, required: true, trim: true },
    eligibleAmountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ReturnPickupAddressSnapshotSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

export const ReturnRequestSchema = new Schema(
  {
    returnNumber: {
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ReturnType),
      default: ReturnType.RETURN,
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReturnReason),
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    evidenceImages: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: Object.values(ReturnStatus),
      default: ReturnStatus.REQUESTED,
      required: true,
      index: true,
    },
    pickupAddressSnapshot: {
      type: ReturnPickupAddressSnapshotSchema,
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    pickupScheduledAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: String,
      trim: true,
    },
    inspectedAt: {
      type: Date,
      default: null,
    },
    inspectedBy: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: String,
      trim: true,
    },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "Return request must contain at least one item",
      },
    },
    returnShipment: {
      type: ReturnShipmentSchema,
    },
    policySnapshot: {
      type: ReturnPolicySnapshotSchema,
    },
    refundRequestedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "return_requests",
  }
);

ReturnRequestSchema.index({ orderId: 1, status: 1 });
ReturnRequestSchema.index({ customerId: 1, createdAt: -1 });
ReturnRequestSchema.index({ status: 1, createdAt: -1 });
ReturnRequestSchema.index({ warehouseId: 1, status: 1 });

export const ExchangeRequestSchema = new Schema(
  {
    exchangeNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    returnRequestId: {
      type: Schema.Types.ObjectId,
      ref: "ReturnRequest",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    originalItem: {
      orderItemId: { type: String, required: true, trim: true },
      variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      sku: { type: String, trim: true },
      productName: { type: String, trim: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPriceMinor: { type: Number, min: 0 },
    },
    requestedVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    replacementProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    replacementSku: {
      type: String,
      trim: true,
    },
    replacementSize: {
      type: String,
      trim: true,
    },
    replacementColor: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      enum: Object.values(ReturnReason),
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ExchangeStatus),
      default: ExchangeStatus.REQUESTED,
      required: true,
      index: true,
    },
    reservationId: {
      type: String,
      trim: true,
    },
    fulfillmentId: {
      type: Schema.Types.ObjectId,
      ref: "Fulfillment",
    },
    replacementOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
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
    collection: "exchange_requests",
  }
);

ExchangeRequestSchema.index({ orderId: 1, status: 1 });
ExchangeRequestSchema.index({ customerId: 1, createdAt: -1 });
ExchangeRequestSchema.index({ status: 1, createdAt: -1 });
