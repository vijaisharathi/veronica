import { Schema } from "mongoose";
import { PaymentStatus } from "@/constants/status";

export const PaymentSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    checkoutSessionId: {
      type: Schema.Types.ObjectId,
      ref: "CheckoutSession",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      sparse: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Payment amount must be an integer minor unit (e.g., paise)",
      },
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
      required: true,
      index: true,
    },
    method: {
      type: String,
      trim: true,
    },
    attemptsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payments",
  }
);

PaymentSchema.index({ checkoutSessionId: 1, status: 1 });
PaymentSchema.index({ customerId: 1, createdAt: -1 });

export const PaymentAttemptSchema = new Schema(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    checkoutSessionId: {
      type: Schema.Types.ObjectId,
      ref: "CheckoutSession",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      sparse: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Attempt amount must be an integer minor unit (e.g., paise)",
      },
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
      required: true,
    },
    failureCode: {
      type: String,
      trim: true,
    },
    failureMessage: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payment_attempts",
  }
);

PaymentAttemptSchema.index({ paymentId: 1, createdAt: -1 });

export const PaymentWebhookEventSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      sparse: true,
      index: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSED", "FAILED", "DUPLICATE"],
      default: "PENDING",
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    error: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "payment_webhook_events",
  }
);

PaymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const PaymentStatusHistorySchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
    },
    toStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
    },
    source: {
      type: String,
      enum: ["CLIENT_VERIFY", "WEBHOOK", "SYSTEM", "RECONCILIATION"],
      required: true,
    },
    providerEventId: {
      type: String,
      trim: true,
      sparse: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payment_status_histories",
  }
);

PaymentStatusHistorySchema.index({ paymentId: 1, timestamp: -1 });
