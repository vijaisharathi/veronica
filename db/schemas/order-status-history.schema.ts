import { Schema } from "mongoose";
import { OrderStatus } from "@/constants/status";
import { IOrderStatusHistory } from "@/types/database";

export const OrderStatusHistorySchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    toStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    changedBy: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "order_status_history",
  }
);

OrderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });
