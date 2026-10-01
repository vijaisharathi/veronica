/**
 * VÉRONA — Orders Domain Types & Contracts (Phase 19)
 *
 * Defines strongly-typed DTOs, domain events, state machine constraints,
 * and reconciliation structures for server-authoritative order management.
 */

import { OrderStatus, PaymentStatus } from "@/constants/status";
import { MinorUnits } from "@/types/database";

export const OrderCancellationReason = {
  CUSTOMER_CHANGED_MIND: "CUSTOMER_CHANGED_MIND",
  ORDERED_WRONG_SIZE: "ORDERED_WRONG_SIZE",
  ORDERED_WRONG_PRODUCT: "ORDERED_WRONG_PRODUCT",
  FOUND_BETTER_PRICE: "FOUND_BETTER_PRICE",
  DELIVERY_TIME_TOO_LONG: "DELIVERY_TIME_TOO_LONG",
  OTHER: "OTHER",
} as const;

export type OrderCancellationReason =
  (typeof OrderCancellationReason)[keyof typeof OrderCancellationReason];

export interface CreateOrderInput {
  paymentId: string;
}

export interface CancelOrderInput {
  reason: OrderCancellationReason;
  notes?: string;
}

export interface AdminUpdateOrderStatusInput {
  status: OrderStatus;
  reason?: string;
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  brandName: string;
  size: string;
  color: string;
  image: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
  discountMinor: MinorUnits;
  taxMinor: MinorUnits;
  finalPriceMinor: MinorUnits;
}

export interface OrderPricingDTO {
  subtotalMinor: MinorUnits;
  discountMinor: MinorUnits;
  couponDiscountMinor: MinorUnits;
  totalDiscountMinor: MinorUnits;
  shippingMinor: MinorUnits;
  taxMinor: MinorUnits;
  totalMinor: MinorUnits;
  currency: string;
}

export interface OrderAddressDTO {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface OrderCouponDTO {
  code: string;
  discountMinor: MinorUnits;
  couponId?: string;
}

export interface OrderPaymentSummaryDTO {
  paymentId?: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  paymentStatus: PaymentStatus;
  paidAmountMinor: MinorUnits;
  currency: string;
}

export interface OrderCancellationDTO {
  reason: string;
  cancelledAt: string;
  cancelledBy: string;
  notes?: string;
}

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string;
  checkoutSessionId?: string;
  email: string;
  phone: string;
  items: OrderItemDTO[];
  pricing: OrderPricingDTO;
  shippingAddress: OrderAddressDTO;
  billingAddress: OrderAddressDTO;
  coupon?: OrderCouponDTO;
  paymentSummary: OrderPaymentSummaryDTO;
  status: OrderStatus;
  cancellation?: OrderCancellationDTO;
  timeline: OrderTimelineStep[];
  canCancel: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryDTO {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  reason?: string;
  changedBy: string;
  createdAt: string;
}

export interface OrderFilterOptions {
  status?: OrderStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface OrderCreatedEvent {
  eventId: string;
  type: "order.created";
  orderId: string;
  orderNumber: string;
  customerId: string;
  paymentId: string;
  totalAmountMinor: MinorUnits;
  currency: string;
  createdAt: string;
}

export interface OrderStatusChangedEvent {
  eventId: string;
  type: "order.status.changed";
  orderId: string;
  orderNumber: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  reason?: string;
  timestamp: string;
}

export interface OrderCancelledEvent {
  eventId: string;
  type: "order.cancelled";
  orderId: string;
  orderNumber: string;
  customerId: string;
  reason: string;
  cancelledBy: string;
  timestamp: string;
}

export interface PaymentOrderReconciliationMismatch {
  type: "CAPTURED_PAYMENT_WITHOUT_ORDER" | "PAYMENT_AMOUNT_MISMATCH" | "PAYMENT_STATUS_MISMATCH";
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  paymentStatus: PaymentStatus;
  orderStatus?: OrderStatus;
  paymentAmountMinor: MinorUnits;
  orderAmountMinor?: MinorUnits;
  description: string;
}
