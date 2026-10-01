import { Schema } from "mongoose";
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  SupportSenderType,
  SupportMessageType,
} from "@/constants/status";

export const SupportTicketSchema = new Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(SupportCategory),
      default: SupportCategory.OTHER,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    priority: {
      type: String,
      enum: Object.values(SupportTicketPriority),
      default: SupportTicketPriority.MEDIUM,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatus),
      default: SupportTicketStatus.OPEN,
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    assignedTeam: {
      type: String,
      trim: true,
      default: null,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
      index: true,
    },
    returnRequestId: {
      type: Schema.Types.ObjectId,
      ref: "ReturnRequest",
      default: null,
      index: true,
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: "Refund",
      default: null,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    slaFirstResponseDeadline: {
      type: Date,
      default: null,
      index: true,
    },
    slaResolutionDeadline: {
      type: Date,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "support_tickets",
  }
);

SupportTicketSchema.index({ customerId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });
SupportTicketSchema.index({ category: 1, status: 1 });

export const SupportMessageSchema = new Schema(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: Object.values(SupportSenderType),
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    senderDisplayName: {
      type: String,
      trim: true,
      default: null,
    },
    messageType: {
      type: String,
      enum: Object.values(SupportMessageType),
      default: SupportMessageType.MESSAGE,
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        fileType: { type: String, required: true, trim: true },
        fileSize: { type: Number, required: true, min: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "support_messages",
  }
);

SupportMessageSchema.index({ ticketId: 1, createdAt: 1 });
SupportMessageSchema.index({ ticketId: 1, isInternal: 1, createdAt: 1 });
