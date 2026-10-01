/**
 * VÉRONA — Refund Request Validation Schemas
 *
 * Enforces strict input validation for customer queries and admin operations.
 */

import { z } from "zod";
import { RefundStatus, RefundType, RefundSourceType } from "@/constants/status";

export const CreateManualRefundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  amountMinor: z
    .number()
    .int("Amount must be an integer minor unit (paise)")
    .positive("Amount must be strictly greater than zero"),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
  refundShipping: z.boolean().optional(),
});
export type CreateManualRefundInput = z.infer<typeof CreateManualRefundSchema>;

export const RetryRefundSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RetryRefundInput = z.infer<typeof RetryRefundSchema>;

export const ReconcileRefundSchema = z.object({
  notes: z.string().max(500).optional(),
});
export type ReconcileRefundInput = z.infer<typeof ReconcileRefundSchema>;

export const AdminRefundQuerySchema = z.object({
  status: z.nativeEnum(RefundStatus).optional(),
  type: z.nativeEnum(RefundType).optional(),
  sourceType: z.nativeEnum(RefundSourceType).optional(),
  orderNumber: z.string().optional(),
  refundNumber: z.string().optional(),
  providerRefundId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type AdminRefundQueryInput = z.infer<typeof AdminRefundQuerySchema>;
