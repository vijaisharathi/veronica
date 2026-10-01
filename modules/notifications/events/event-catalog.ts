/**
 * VÉRONA — Domain Event Catalog & Notification Mappings (Phase 25)
 *
 * Authoritative contracts for domain events received from upstream business modules
 * (Orders, Payments, Shipping, Returns, Refunds, Reviews, Security).
 */

import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from "@/constants/status";

// ── Base Event Contract ───────────────────────────────────────────────────────

export interface BaseDomainEvent {
  eventId: string;
  eventType: string;
  customerId: string;
  occurredAt: Date | string;
  correlationId?: string;
}

// ── Upstream Domain Event Contracts ───────────────────────────────────────────

export interface OrderConfirmedEvent extends BaseDomainEvent {
  eventType: "order.confirmed";
  orderId: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  itemCount: number;
  recipientEmail?: string;
  shippingCity?: string;
}

export interface OrderShippedEvent extends BaseDomainEvent {
  eventType: "order.shipped";
  orderId: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
}

export interface OrderDeliveredEvent extends BaseDomainEvent {
  eventType: "order.delivered";
  orderId: string;
  orderNumber: string;
  deliveredAt: string;
  productSlug?: string;
}

export interface OrderCancelledEvent extends BaseDomainEvent {
  eventType: "order.cancelled";
  orderId: string;
  orderNumber: string;
  reason: string;
}

export interface PaymentCompletedEvent extends BaseDomainEvent {
  eventType: "payment.completed";
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
}

export interface PaymentFailedEvent extends BaseDomainEvent {
  eventType: "payment.failed";
  paymentId?: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  reason: string;
}

export interface RefundCompletedEvent extends BaseDomainEvent {
  eventType: "refund.completed";
  refundId: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  sourceType: string;
}

export interface RefundFailedEvent extends BaseDomainEvent {
  eventType: "refund.failed";
  refundId: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  reason: string;
}

export interface ReturnApprovedEvent extends BaseDomainEvent {
  eventType: "return.approved";
  returnId: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  pickupScheduledDate?: string;
  pickupCarrier?: string;
}

export interface ReturnRejectedEvent extends BaseDomainEvent {
  eventType: "return.rejected";
  returnId: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  reason: string;
}

export interface ReviewPublishedEvent extends BaseDomainEvent {
  eventType: "review.published";
  reviewId: string;
  productId: string;
  productName: string;
  rating: number;
}

export interface AccountSecurityEvent extends BaseDomainEvent {
  eventType: "account.security" | "password.changed" | "account.created";
  activityDescription: string;
  ipAddress?: string;
  userAgent?: string;
}

export type VeronaDomainEvent =
  | OrderConfirmedEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | RefundCompletedEvent
  | RefundFailedEvent
  | ReturnApprovedEvent
  | ReturnRejectedEvent
  | ReviewPublishedEvent
  | AccountSecurityEvent;

// ── Event Metadata & Mapping Configuration ────────────────────────────────────

export interface EventMappingConfig {
  notificationType: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  generateTitle: (event: Record<string, unknown>) => string;
  generateMessage: (event: Record<string, unknown>) => string;
  generateActionUrl: (event: Record<string, unknown>) => string | undefined;
  templateKey: string;
}

export const EVENT_CATALOG_CONFIG: Record<string, EventMappingConfig> = {
  "order.confirmed": {
    notificationType: NotificationType.ORDER_CONFIRMED,
    category: NotificationCategory.ORDERS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Order Confirmed: #${e.orderNumber}`,
    generateMessage: (e) =>
      `Thank you for your order #${e.orderNumber}. Our atelier artisans have commenced garment preparation.`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}`,
    templateKey: "order.confirmed",
  },
  "order.shipped": {
    notificationType: NotificationType.ORDER_SHIPPED,
    category: NotificationCategory.DELIVERY,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Your Order Has Shipped: #${e.orderNumber}`,
    generateMessage: (e) =>
      `Order #${e.orderNumber} has been dispatched with ${e.carrier || "express courier"} (Waybill: ${e.trackingNumber || "Track Online"}).`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}/tracking`,
    templateKey: "order.shipped",
  },
  "order.delivered": {
    notificationType: NotificationType.ORDER_DELIVERED,
    category: NotificationCategory.DELIVERY,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Garment Delivered: Order #${e.orderNumber}`,
    generateMessage: (e) =>
      `Your VÉRONA atelier selection for order #${e.orderNumber} has arrived. We invite you to experience the fitting.`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}`,
    templateKey: "order.delivered",
  },
  "order.cancelled": {
    notificationType: NotificationType.ORDER_CANCELLED,
    category: NotificationCategory.ORDERS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Order Cancelled: #${e.orderNumber}`,
    generateMessage: (e) =>
      `Order #${e.orderNumber} has been cancelled. Any pre-authorized charges have been released.`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}`,
    templateKey: "order.cancelled",
  },
  "payment.completed": {
    notificationType: NotificationType.PAYMENT_SUCCESS,
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Payment Confirmed: Order #${e.orderNumber}`,
    generateMessage: (e) =>
      `Your payment for order #${e.orderNumber} was successfully verified.`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}`,
    templateKey: "payment.completed",
  },
  "payment.failed": {
    notificationType: NotificationType.PAYMENT_FAILED,
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.CRITICAL,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Payment Action Required: Order #${e.orderNumber}`,
    generateMessage: (e) =>
      `Payment attempt for order #${e.orderNumber} was unsuccessful: ${e.reason || "Bank authorization declined"}. Please update payment details.`,
    generateActionUrl: (e) => `/account/orders/${e.orderNumber}`,
    templateKey: "payment.failed",
  },
  "refund.completed": {
    notificationType: NotificationType.REFUND_COMPLETED,
    category: NotificationCategory.RETURNS_REFUNDS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Refund Processed: #${e.refundNumber}`,
    generateMessage: (e) =>
      `Your refund #${e.refundNumber} for order #${e.orderNumber} has been successfully settled to your original payment source.`,
    generateActionUrl: (e) => `/account/refunds/${e.refundNumber}`,
    templateKey: "refund.completed",
  },
  "return.approved": {
    notificationType: NotificationType.RETURN_APPROVED,
    category: NotificationCategory.RETURNS_REFUNDS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Return Request Approved: #${e.returnNumber}`,
    generateMessage: (e) =>
      `Your return request #${e.returnNumber} has been approved. A courier pickup has been scheduled.`,
    generateActionUrl: (e) => `/account/returns/${e.returnNumber}`,
    templateKey: "return.approved",
  },
  "return.rejected": {
    notificationType: NotificationType.RETURN_REJECTED,
    category: NotificationCategory.RETURNS_REFUNDS,
    priority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Return Request Update: #${e.returnNumber}`,
    generateMessage: (e) =>
      `Your return request #${e.returnNumber} could not be approved: ${e.reason || "Policy terms not satisfied"}.`,
    generateActionUrl: (e) => `/account/returns/${e.returnNumber}`,
    templateKey: "return.rejected",
  },
  "review.published": {
    notificationType: NotificationType.REVIEW_PUBLISHED,
    category: NotificationCategory.REVIEWS,
    priority: NotificationPriority.NORMAL,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Review Live: ${e.productName}`,
    generateMessage: (e) =>
      `Thank you for reviewing ${e.productName}. Your verified garment feedback is now published in the VÉRONA catalogue.`,
    generateActionUrl: (e) => (e.productId ? `/product/${e.productId}` : `/account/reviews`),
    templateKey: "review.published",
  },
  "account.security": {
    notificationType: NotificationType.ACCOUNT_SECURITY,
    category: NotificationCategory.SECURITY,
    priority: NotificationPriority.CRITICAL,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    generateTitle: (e) => `Security Alert: VÉRONA Account Activity`,
    generateMessage: (e) =>
      `Security notice: ${e.activityDescription || "New activity detected on your client account"}.`,
    generateActionUrl: () => `/account/settings`,
    templateKey: "account.security",
  },
};
