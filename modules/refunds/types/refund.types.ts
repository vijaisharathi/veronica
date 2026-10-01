/**
 * VÉRONA — Refund Domain Types & DTO Definitions
 *
 * Authoritative types for refund calculation, lifecycle state transitions,
 * provider adapters, customer DTOs, admin inspection, and audit records.
 * All monetary amounts are integer minor units (paise).
 */

import {
  RefundStatus,
  RefundType,
  RefundSourceType,
  RefundAttemptStatus,
} from "@/constants/status";
import {
  MinorUnits,
  IOrderItemSnapshot,
  IOrderPricingSnapshot,
  IOrderCouponSnapshot,
  IRefundCalculationSnapshot,
  IRefundAttempt,
  IRefundReconciliationState,
} from "@/types/database";

/**
 * Input for server-side refund calculation.
 * Never trust client amounts; derive strictly from historical order financial snapshots.
 */
export interface RefundCalculationInput {
  orderPricing: IOrderPricingSnapshot;
  orderItems: IOrderItemSnapshot[];
  coupon?: IOrderCouponSnapshot;
  paidAmountMinor: MinorUnits;
  previouslyRefundedMinor: MinorUnits;
  itemsToRefund?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  refundShipping?: boolean;
  customAdjustmentMinor?: MinorUnits;
  reason?: string;
  sourceType: RefundSourceType;
}

/**
 * Result of immutable refund calculation.
 */
export interface RefundCalculationResult {
  calculationSnapshot: IRefundCalculationSnapshot;
  finalRefundAmountMinor: MinorUnits;
  refundableRemainingAfter: MinorUnits;
  isFullRefund: boolean;
}

/**
 * Internal input to request a refund.
 */
export interface CreateRefundInput {
  orderId: string;
  orderNumber?: string;
  paymentId: string;
  customerId: string;
  returnRequestId?: string;
  type: RefundType;
  sourceType: RefundSourceType;
  sourceId?: string;
  reason: string;
  itemsToRefund?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  refundShipping?: boolean;
  customAmountMinor?: MinorUnits;
  initiatedBy: string;
  idempotencyKey?: string;
}

/**
 * Client-safe customer refund item DTO.
 */
export interface CustomerRefundItemDTO {
  productName: string;
  variantDescription?: string;
  quantity: number;
  amountMinor: MinorUnits;
}

/**
 * Client-safe customer refund summary DTO (Section 83).
 */
export interface CustomerRefundDTO {
  refundNumber: string;
  orderNumber: string;
  type: RefundType;
  amountMinor: MinorUnits;
  currency: string;
  status: RefundStatus;
  reason: string;
  initiatedAt: string;
  completedAt?: string;
  items?: CustomerRefundItemDTO[];
}

/**
 * Client-safe customer refund detail DTO.
 */
export interface CustomerRefundDetailDTO extends CustomerRefundDTO {
  timeline: Array<{
    status: RefundStatus;
    label: string;
    timestamp?: string;
    completed: boolean;
  }>;
}

/**
 * Privileged Admin Refund DTO (Section 83).
 */
export interface AdminRefundDTO {
  id: string;
  refundNumber: string;
  orderId: string;
  orderNumber?: string;
  paymentId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  returnRequestId?: string;
  amountMinor: MinorUnits;
  currency: string;
  reason: string;
  type: RefundType;
  sourceType: RefundSourceType;
  sourceId?: string;
  status: RefundStatus;
  provider: string;
  providerRefundId?: string;
  initiatedBy: string;
  approvedBy?: string;
  calculationSnapshot?: IRefundCalculationSnapshot;
  attempts: IRefundAttempt[];
  reconciliationState?: IRefundReconciliationState;
  failureCode?: string;
  failureMessage?: string;
  notes?: string;
  initiatedAt?: string;
  processedAt?: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin refund query filters.
 */
export interface AdminRefundQueryFilters {
  status?: RefundStatus;
  type?: RefundType;
  sourceType?: RefundSourceType;
  orderNumber?: string;
  refundNumber?: string;
  providerRefundId?: string;
  customerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
}
