/**
 * VÉRONA — Order Validation Schemas (Phase 19)
 *
 * Zod validation schemas enforcing contract correctness on order endpoints.
 */

import { z } from "zod";
import { OrderStatus } from "@/constants/status";
import { OrderCancellationReason } from "../types/order.types";

export const CreateOrderSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
});

export const CancelOrderSchema = z.object({
  reason: z.nativeEnum(OrderCancellationReason, {
    errorMap: () => ({ message: "A valid cancellation reason must be provided." }),
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const AdminUpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: "A valid OrderStatus must be provided." }),
  }),
  reason: z.string().max(255, "Reason cannot exceed 255 characters").optional(),
});

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().trim().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const OrderIdOrNumberParamSchema = z.object({
  orderNumber: z.string().min(1, "Order identifier is required").trim(),
});
