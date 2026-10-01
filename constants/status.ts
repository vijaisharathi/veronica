/**
 * VÉRONA — Centralized Domain Status & Value Enums
 *
 * System-wide status definitions and value constraints.
 * Centralizing these prevents string scattering and guarantees type-safety
 * between TypeScript boundaries and Mongoose persistence schemas.
 */

export const CustomerStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const StaffStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type StaffStatus = (typeof StaffStatus)[keyof typeof StaffStatus];

export const Gender = {
  MEN: "MEN",
  WOMEN: "WOMEN",
  KIDS: "KIDS",
  UNISEX: "UNISEX",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const ProductStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const ProductVisibility = {
  PUBLIC: "PUBLIC",
  HIDDEN: "HIDDEN",
} as const;
export type ProductVisibility = (typeof ProductVisibility)[keyof typeof ProductVisibility];

export const VariantStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DISCONTINUED: "DISCONTINUED",
} as const;
export type VariantStatus = (typeof VariantStatus)[keyof typeof VariantStatus];

export const WarehouseStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
  ARCHIVED: "ARCHIVED",
} as const;
export type WarehouseStatus = (typeof WarehouseStatus)[keyof typeof WarehouseStatus];

export const InventoryStatus = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;
export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus];

export const StockMovementType = {
  RECEIPT: "RECEIPT",
  PURCHASE: "PURCHASE",
  RESTOCK: "RESTOCK",
  SALE: "SALE",
  RESERVATION: "RESERVATION",
  RELEASE: "RELEASE",
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
  DAMAGE: "DAMAGE",
  LOSS: "LOSS",
  ADJUSTMENT: "ADJUSTMENT",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  TRANSFER: "TRANSFER",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const StockAdjustmentReason = {
  PHYSICAL_COUNT: "PHYSICAL_COUNT",
  DAMAGE: "DAMAGE",
  LOSS: "LOSS",
  CORRECTION: "CORRECTION",
  QUALITY_CONTROL: "QUALITY_CONTROL",
  OTHER: "OTHER",
} as const;
export type StockAdjustmentReason = (typeof StockAdjustmentReason)[keyof typeof StockAdjustmentReason];

export const StockReservationStatus = {
  ACTIVE: "ACTIVE",
  RELEASED: "RELEASED",
  CONSUMED: "CONSUMED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type StockReservationStatus = (typeof StockReservationStatus)[keyof typeof StockReservationStatus];

export const AddressType = {
  HOME: "HOME",
  WORK: "WORK",
  OTHER: "OTHER",
} as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];

export const CartStatus = {
  ACTIVE: "ACTIVE",
  ABANDONED: "ABANDONED",
  CONVERTED: "CONVERTED",
} as const;
export type CartStatus = (typeof CartStatus)[keyof typeof CartStatus];

export const CheckoutSessionStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  INVALID: "INVALID",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type CheckoutSessionStatus = (typeof CheckoutSessionStatus)[keyof typeof CheckoutSessionStatus];

export const DiscountType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const CampaignStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CouponStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
} as const;
export type CouponStatus = (typeof CouponStatus)[keyof typeof CouponStatus];

export const OrderStatus = {
  PENDING: "PENDING",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  RETURN_PICKED_UP: "RETURN_PICKED_UP",
  RETURNED: "RETURNED",
  REFUND_INITIATED: "REFUND_INITIATED",
  REFUNDED: "REFUNDED",
  EXCHANGE_REQUESTED: "EXCHANGE_REQUESTED",
  EXCHANGED: "EXCHANGED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  UNKNOWN: "UNKNOWN",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  REQUESTED: "REQUESTED",
  ELIGIBLE: "ELIGIBLE",
  INITIATED: "INITIATED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  RETRY_PENDING: "RETRY_PENDING",
  RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const FulfillmentStatus = {
  PENDING: "PENDING",
  READY_FOR_FULFILLMENT: "READY_FOR_FULFILLMENT",
  ALLOCATED: "ALLOCATED",
  PICKING: "PICKING",
  PICKED: "PICKED",
  PACKING: "PACKING",
  PACKED: "PACKED",
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export type FulfillmentStatus = (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];

export const ShipmentStatus = {
  CREATED: "CREATED",
  LABEL_CREATED: "LABEL_CREATED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  RTO_INITIATED: "RTO_INITIATED",
  RTO_IN_TRANSIT: "RTO_IN_TRANSIT",
  RTO_DELIVERED: "RTO_DELIVERED",
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const ShipmentEventSource = {
  SYSTEM: "SYSTEM",
  ADMIN: "ADMIN",
  WAREHOUSE: "WAREHOUSE",
  PROVIDER: "PROVIDER",
  WEBHOOK: "WEBHOOK",
  RECONCILIATION: "RECONCILIATION",
} as const;
export type ShipmentEventSource = (typeof ShipmentEventSource)[keyof typeof ShipmentEventSource];

export const ReturnStatus = {
  REQUESTED: "REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PICKUP_SCHEDULED: "PICKUP_SCHEDULED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  RECEIVED: "RECEIVED",
  INSPECTING: "INSPECTING",
  INSPECTION: "INSPECTION",
  APPROVED_FOR_SETTLEMENT: "APPROVED_FOR_SETTLEMENT",
  APPROVED_FOR_REFUND: "APPROVED_FOR_REFUND",
  REFUND_INITIATED: "REFUND_INITIATED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export const ExchangeStatus = {
  REQUESTED: "REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  RETURN_PENDING: "RETURN_PENDING",
  ITEM_RECEIVED: "ITEM_RECEIVED",
  EXCHANGE_APPROVED: "EXCHANGE_APPROVED",
  FULFILLMENT_PENDING: "FULFILLMENT_PENDING",
  FULFILLED: "FULFILLED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  EXCHANGED: "EXCHANGED",
  CANCELLED: "CANCELLED",
} as const;
export type ExchangeStatus = (typeof ExchangeStatus)[keyof typeof ExchangeStatus];

export const ReturnType = {
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
} as const;
export type ReturnType = (typeof ReturnType)[keyof typeof ReturnType];

export const ReturnReason = {
  WRONG_SIZE: "WRONG_SIZE",
  WRONG_COLOR: "WRONG_COLOR",
  WRONG_PRODUCT: "WRONG_PRODUCT",
  DAMAGED: "DAMAGED",
  DEFECTIVE: "DEFECTIVE",
  NOT_AS_EXPECTED: "NOT_AS_EXPECTED",
  QUALITY_ISSUE: "QUALITY_ISSUE",
  CHANGED_MIND: "CHANGED_MIND",
  OTHER: "OTHER",
} as const;
export type ReturnReason = (typeof ReturnReason)[keyof typeof ReturnReason];

export const ReturnMethod = {
  PICKUP: "PICKUP",
  DROP_OFF: "DROP_OFF",
} as const;
export type ReturnMethod = (typeof ReturnMethod)[keyof typeof ReturnMethod];

export const InspectionResult = {
  PASSED: "PASSED",
  FAILED: "FAILED",
  PARTIAL: "PARTIAL",
} as const;
export type InspectionResult = (typeof InspectionResult)[keyof typeof InspectionResult];

export const ReturnItemCondition = {
  UNOPENED: "UNOPENED",
  OPENED_UNUSED: "OPENED_UNUSED",
  WORN_OR_USED: "WORN_OR_USED",
  DAMAGED_TAGS_MISSING: "DAMAGED_TAGS_MISSING",
  DEFECTIVE: "DEFECTIVE",
} as const;
export type ReturnItemCondition = (typeof ReturnItemCondition)[keyof typeof ReturnItemCondition];

export const ReturnDisposition = {
  RESTOCK: "RESTOCK",
  DAMAGED: "DAMAGED",
  DEFECTIVE: "DEFECTIVE",
  QUARANTINE: "QUARANTINE",
  DISPOSE: "DISPOSE",
  RETURN_TO_VENDOR: "RETURN_TO_VENDOR",
} as const;
export type ReturnDisposition = (typeof ReturnDisposition)[keyof typeof ReturnDisposition];

export const ReturnPickupFailureReason = {
  PICKUP_FAILED: "PICKUP_FAILED",
  CUSTOMER_UNAVAILABLE: "CUSTOMER_UNAVAILABLE",
  ADDRESS_UNSERVICEABLE: "ADDRESS_UNSERVICEABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;
export type ReturnPickupFailureReason = (typeof ReturnPickupFailureReason)[keyof typeof ReturnPickupFailureReason];

export const RefundType = {
  FULL_ORDER: "FULL_ORDER",
  PARTIAL_ORDER: "PARTIAL_ORDER",
  RETURN: "RETURN",
  CANCELLATION: "CANCELLATION",
  MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT",
} as const;
export type RefundType = (typeof RefundType)[keyof typeof RefundType];

export const RefundSourceType = {
  RETURN: "RETURN",
  ORDER_CANCELLATION: "ORDER_CANCELLATION",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
  PAYMENT_CORRECTION: "PAYMENT_CORRECTION",
} as const;
export type RefundSourceType = (typeof RefundSourceType)[keyof typeof RefundSourceType];

export const RefundAttemptStatus = {
  INITIATED: "INITIATED",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  TIMEOUT: "TIMEOUT",
} as const;
export type RefundAttemptStatus = (typeof RefundAttemptStatus)[keyof typeof RefundAttemptStatus];

export const ReviewStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const ReviewReportReason = {
  SPAM: "SPAM",
  OFFENSIVE: "OFFENSIVE",
  FAKE_REVIEW: "FAKE_REVIEW",
  IRRELEVANT: "IRRELEVANT",
  HARASSMENT: "HARASSMENT",
  OTHER: "OTHER",
} as const;
export type ReviewReportReason = (typeof ReviewReportReason)[keyof typeof ReviewReportReason];

export const ReviewReportStatus = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
} as const;
export type ReviewReportStatus = (typeof ReviewReportStatus)[keyof typeof ReviewReportStatus];

export const ReviewModerationReason = {
  SPAM: "SPAM",
  ABUSIVE_CONTENT: "ABUSIVE_CONTENT",
  IRRELEVANT: "IRRELEVANT",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  DUPLICATE: "DUPLICATE",
  CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
  OTHER: "OTHER",
} as const;
export type ReviewModerationReason = (typeof ReviewModerationReason)[keyof typeof ReviewModerationReason];

export const NotificationType = {
  // Orders
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_PROCESSING: "ORDER_PROCESSING",
  ORDER_PACKED: "ORDER_PACKED",
  ORDER_SHIPPED: "ORDER_SHIPPED",
  ORDER_OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  ORDER_CANCELLED: "ORDER_CANCELLED",

  // Payments
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_RECONCILIATION_REQUIRED: "PAYMENT_RECONCILIATION_REQUIRED",

  // Returns & Exchanges
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  RETURN_PICKED_UP: "RETURN_PICKED_UP",
  RETURN_RECEIVED: "RETURN_RECEIVED",
  RETURN_COMPLETED: "RETURN_COMPLETED",
  EXCHANGE_REQUESTED: "EXCHANGE_REQUESTED",
  EXCHANGE_APPROVED: "EXCHANGE_APPROVED",
  EXCHANGE_REJECTED: "EXCHANGE_REJECTED",
  EXCHANGE_SHIPPED: "EXCHANGE_SHIPPED",
  EXCHANGE_DELIVERED: "EXCHANGE_DELIVERED",

  // Refunds
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_INITIATED: "REFUND_INITIATED",
  REFUND_PROCESSING: "REFUND_PROCESSING",
  REFUND_COMPLETED: "REFUND_COMPLETED",
  REFUND_FAILED: "REFUND_FAILED",

  // Reviews
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",
  REVIEW_PUBLISHED: "REVIEW_PUBLISHED",

  // Account & Security
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_SECURITY: "ACCOUNT_SECURITY",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",

  // System & Marketing
  PROMOTION: "PROMOTION",
  ACCOUNT: "ACCOUNT",
  SYSTEM: "SYSTEM",
  SYSTEM_ALERT: "SYSTEM_ALERT",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationChannel = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  PUSH: "PUSH",
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationPriority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW",
} as const;
export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationCategory = {
  ORDERS: "ORDERS",
  PAYMENTS: "PAYMENTS",
  DELIVERY: "DELIVERY",
  RETURNS_REFUNDS: "RETURNS_REFUNDS",
  REVIEWS: "REVIEWS",
  SECURITY: "SECURITY",
  MARKETING: "MARKETING",
} as const;
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NotificationDeliveryStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  RETRY_PENDING: "RETRY_PENDING",
  CANCELLED: "CANCELLED",
  BOUNCED: "BOUNCED",
} as const;
export type NotificationDeliveryStatus = (typeof NotificationDeliveryStatus)[keyof typeof NotificationDeliveryStatus];

export const NotificationStatus = {
  UNREAD: "UNREAD",
  READ: "READ",
  ARCHIVED: "ARCHIVED",
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const EmailEventStatus = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  CLICKED: "CLICKED",
  FAILED: "FAILED",
  BOUNCED: "BOUNCED",
  COMPLAINED: "COMPLAINED",
} as const;
export type EmailEventStatus = (typeof EmailEventStatus)[keyof typeof EmailEventStatus];

export const SupportTicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_FOR_CUSTOMER: "WAITING_FOR_CUSTOMER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const SupportTicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type SupportTicketPriority = (typeof SupportTicketPriority)[keyof typeof SupportTicketPriority];
export const SupportPriority = SupportTicketPriority;
export type SupportPriority = SupportTicketPriority;

export const SupportCategory = {
  ORDER: "ORDER",
  PAYMENT: "PAYMENT",
  DELIVERY: "DELIVERY",
  RETURN: "RETURN",
  REFUND: "REFUND",
  PRODUCT: "PRODUCT",
  ACCOUNT: "ACCOUNT",
  TECHNICAL: "TECHNICAL",
  OTHER: "OTHER",
} as const;
export type SupportCategory = (typeof SupportCategory)[keyof typeof SupportCategory];

export const SupportSenderType = {
  CUSTOMER: "CUSTOMER",
  SUPPORT_AGENT: "SUPPORT_AGENT",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type SupportSenderType = (typeof SupportSenderType)[keyof typeof SupportSenderType];

export const SupportMessageType = {
  MESSAGE: "MESSAGE",
  INTERNAL_NOTE: "INTERNAL_NOTE",
  SYSTEM_EVENT: "SYSTEM_EVENT",
} as const;
export type SupportMessageType = (typeof SupportMessageType)[keyof typeof SupportMessageType];

export const SupportSlaState = {
  ON_TRACK: "ON_TRACK",
  AT_RISK: "AT_RISK",
  BREACHED: "BREACHED",
} as const;
export type SupportSlaState = (typeof SupportSlaState)[keyof typeof SupportSlaState];

export const AuditActorType = {
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
  SYSTEM: "SYSTEM",
} as const;
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];

export const SystemSettingsCategory = {
  STORE: "STORE",
  PAYMENT: "PAYMENT",
  SHIPPING: "SHIPPING",
  TAX: "TAX",
  NOTIFICATION: "NOTIFICATION",
  FEATURE_FLAGS: "FEATURE_FLAGS",
  MAINTENANCE: "MAINTENANCE",
} as const;
export type SystemSettingsCategory = (typeof SystemSettingsCategory)[keyof typeof SystemSettingsCategory];
