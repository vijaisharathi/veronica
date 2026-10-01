import { Schema } from "mongoose";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationStatus,
  EmailEventStatus,
} from "@/constants/status";
import {
  INotification,
  INotificationPreference,
  INotificationDeliveryAttempt,
  IEmailEvent,
} from "@/types/database";

export const NotificationSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    eventId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      index: true,
      trim: true,
    },
    channels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
      },
    ],
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.ORDERS,
      index: true,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

NotificationSchema.index({ customerId: 1, createdAt: -1 });
NotificationSchema.index({ customerId: 1, readAt: 1 });
NotificationSchema.index({ eventId: 1, customerId: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

export const NotificationPreferenceSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    shippingUpdates: { type: Boolean, default: true },
    returnRefundUpdates: { type: Boolean, default: true },
    reviewUpdates: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true }, // Mandatory: cannot be disabled
    marketing: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "notification_preferences",
  }
);

export const NotificationDeliveryAttemptSchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      sparse: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      default: NotificationDeliveryStatus.PENDING,
      required: true,
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    providerResponse: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorCode: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "notification_delivery_attempts",
  }
);

NotificationDeliveryAttemptSchema.index({ notificationId: 1, channel: 1 });
NotificationDeliveryAttemptSchema.index({ status: 1, nextRetryAt: 1 });
NotificationDeliveryAttemptSchema.index({ customerId: 1, createdAt: -1 });

export const EmailEventSchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
      index: true,
    },
    eventId: {
      type: String,
      sparse: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    template: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EmailEventStatus),
      default: EmailEventStatus.QUEUED,
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    error: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "email_events",
  }
);

EmailEventSchema.index({ recipientEmail: 1, createdAt: -1 });
