/**
 * VÉRONA — Core Database Domain Types & DTO Definitions
 *
 * Strongly-typed domain interfaces for database entities across all 13 business domains.
 * All monetary amounts represent integer minor units (e.g., INR paise, ₹1,299.50 -> 129950).
 */

import {
  CustomerStatus,
  StaffStatus,
  Gender,
  ProductStatus,
  ProductVisibility,
  VariantStatus,
  WarehouseStatus,
  InventoryStatus,
  StockMovementType,
  StockAdjustmentReason,
  StockReservationStatus,
  AddressType,
  CartStatus,
  CheckoutSessionStatus,
  DiscountType,
  CampaignStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  RefundType,
  RefundSourceType,
  RefundAttemptStatus,
  FulfillmentStatus,
  ShipmentStatus,
  ShipmentEventSource,
  ReturnStatus,
  ExchangeStatus,
  ReturnType,
  ReturnReason,
  ReturnMethod,
  InspectionResult,
  ReturnItemCondition,
  ReturnDisposition,
  ReturnPickupFailureReason,
  ReviewStatus,
  ReviewReportReason,
  ReviewReportStatus,
  ReviewModerationReason,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationStatus,
  EmailEventStatus,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportPriority,
  SupportCategory,
  SupportSenderType,
  SupportMessageType,
  SupportSlaState,
  AuditActorType,
  SystemSettingsCategory,
} from "@/constants/status";

export type { PaginatedResult } from "./index";

/**
 * Monetary representation: Integer minor units (e.g., paise for INR).
 * Example: ₹999.50 = 99950.
 */
export type MinorUnits = number;

export interface BaseDbDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt: Date | null;
}

// -------------------------------------------------------------
// DOMAIN 1: IDENTITY
// -------------------------------------------------------------

export interface ICustomerPreferences {
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingWhatsapp: boolean;
}

export interface ICustomer extends BaseDbDocument, SoftDeletable {
  authProviderId?: string | null;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  profileImage?: string | null;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  status: CustomerStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferences: ICustomerPreferences;
  lastLoginAt?: Date | null;
}

export interface IPermission extends BaseDbDocument {
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface IRole extends BaseDbDocument {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  active: boolean;
}

export interface IStaff extends BaseDbDocument, SoftDeletable {
  authProviderId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: StaffStatus;
  roles: string[];
  assignedWarehouseId?: string | null;
  lastLoginAt?: Date | null;
}

// -------------------------------------------------------------
// DOMAIN 2: CATALOG
// -------------------------------------------------------------

export interface ISeoMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ICategory extends BaseDbDocument, SoftDeletable {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  image?: string;
  banner?: string;
  gender: Gender;
  sortOrder: number;
  active: boolean;
  seo?: ISeoMetadata;
}

export interface IBrand extends BaseDbDocument, SoftDeletable {
  name: string;
  slug: string;
  description?: string;
  logo: string;
  banner?: string;
  website?: string;
  active: boolean;
  sortOrder: number;
  seo?: ISeoMetadata;
}

export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface IProductSpecification {
  key: string;
  value: string;
}

export interface IProduct extends BaseDbDocument, SoftDeletable {
  name: string;
  slug: string;
  description: string;
  brandId: string;
  categoryIds: string[];
  collectionIds?: string[];
  gender: Gender;
  productType: string;
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  season?: string;
  tags: string[];
  images: IProductImage[];
  careInstructions: string[];
  specifications: IProductSpecification[];
  seo?: ISeoMetadata;
  status: ProductStatus;
  visibility?: ProductVisibility;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
}

export interface IVariantColor {
  name: string;
  slug: string;
  hexCode: string;
  secondaryHexCode?: string;
}

export interface IProductVariant extends BaseDbDocument {
  productId: string;
  sku: string;
  barcode?: string;
  color: IVariantColor;
  size: string;
  variantImages: string[];
  priceOverride: boolean;
  mrp: MinorUnits;
  sellingPrice: MinorUnits;
  costPrice?: MinorUnits;
  weightInGrams?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  status: VariantStatus;
  active: boolean;
}

export interface IColor extends BaseDbDocument {
  name: string;
  slug: string;
  hexCode: string;
  secondaryHexCode?: string;
  displayOrder: number;
  active: boolean;
}

export interface ISizeAttribute extends BaseDbDocument {
  code: string;
  name: string;
  category: string;
  sortOrder: number;
  active: boolean;
}

export interface IFashionCollection extends BaseDbDocument, SoftDeletable {
  name: string;
  slug: string;
  description?: string;
  heroImage: string;
  banner?: string;
  productIds: string[];
  categoryIds: string[];
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  seo?: ISeoMetadata;
  sortOrder: number;
}

// -------------------------------------------------------------
// DOMAIN 3: INVENTORY
// -------------------------------------------------------------

export interface IWarehouseContact {
  phone: string;
  email: string;
  contactPerson: string;
}

export interface IWarehouseAddress {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface IWarehouse extends BaseDbDocument {
  name: string;
  code: string;
  address: IWarehouseAddress;
  contact: IWarehouseContact;
  status: WarehouseStatus;
  active: boolean;
  operatingStatus: string;
}

export interface IInventoryItem extends BaseDbDocument {
  warehouseId: string;
  productId?: string;
  variantId: string;
  sku?: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  damagedQuantity: number;
  incomingQuantity: number;
  reorderLevel: number;
  status: InventoryStatus;
}

export interface IStockMovement extends BaseDbDocument {
  warehouseId: string;
  variantId: string;
  type: StockMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string;
  referenceId: string;
  reason?: string;
  adjustmentReason?: StockAdjustmentReason;
  performedBy: string;
  timestamp: Date;
}

export interface IStockReservation extends BaseDbDocument {
  reservationId: string;
  referenceType: string;
  referenceId: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
  status: StockReservationStatus;
  expiresAt: Date;
  releasedAt?: Date;
  consumedAt?: Date;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// DOMAIN 4: COMMERCE
// -------------------------------------------------------------

export interface IAddress extends BaseDbDocument {
  customerId: string;
  type: AddressType;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ICartItemSnapshot {
  color: string;
  size: string;
  sku: string;
}

export interface ICartItem extends BaseDbDocument {
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPriceSnapshot: MinorUnits;
  productNameSnapshot: string;
  variantSnapshot: ICartItemSnapshot;
  imageSnapshot: string;
}

export interface ICart extends BaseDbDocument {
  customerId?: string;
  sessionId?: string;
  status: CartStatus;
  subtotal: MinorUnits;
  discount: MinorUnits;
  shipping: MinorUnits;
  tax: MinorUnits;
  total: MinorUnits;
  couponId?: string;
  couponCode?: string;
}

export interface ICheckoutAddressSnapshot {
  addressId?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ICheckoutServiceabilitySnapshot {
  postalCode: string;
  serviceable: boolean;
  state: string;
  city?: string;
  stateName?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
  source: string;
  checkedAt: string;
}

export interface ICheckoutPricingSnapshot {
  subtotalMinor: MinorUnits;
  promotionDiscountMinor: MinorUnits;
  couponDiscountMinor: MinorUnits;
  totalDiscountMinor: MinorUnits;
  amountDueBeforePaymentMinor: MinorUnits;
  currency: string;
  pricingVersion: string;
  calculatedAt: string;
}

export interface ICheckoutSession extends BaseDbDocument {
  customerId: string;
  cartId: string;
  selectedAddressId?: string;
  status: CheckoutSessionStatus;
  addressSnapshot?: ICheckoutAddressSnapshot;
  serviceabilitySnapshot?: ICheckoutServiceabilitySnapshot;
  pricingSnapshot: ICheckoutPricingSnapshot;
  appliedCouponCode?: string;
  expiresAt: Date;
}

export interface IWishlist extends BaseDbDocument {
  customerId: string;
  name: string;
}

export interface IWishlistItem extends BaseDbDocument {
  wishlistId: string;
  customerId: string;
  productId: string;
  variantId?: string;
  addedAt: Date;
}

export interface IRecentlyViewed extends BaseDbDocument {
  customerId?: string;
  sessionId?: string;
  productId: string;
  viewedAt: Date;
}

export interface ICoupon extends BaseDbDocument, SoftDeletable {
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  minCartValue: MinorUnits;
  maxDiscountAmount?: MinorUnits;
  usageLimit?: number;
  perCustomerUsageLimit: number;
  usageCount: number;
  startAt: Date;
  expiresAt: Date;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  applicableBrandIds: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  active: boolean;
  stackable: boolean;
  createdBy?: string;
}

export interface ICampaign extends BaseDbDocument, SoftDeletable {
  name: string;
  slug: string;
  description?: string;
  banner?: string;
  startAt: Date;
  endAt: Date;
  status: CampaignStatus;
  priority: number;
  discountConfig: {
    type: DiscountType;
    value: number;
  };
  targetCategoryIds: string[];
  targetProductIds: string[];
  targetCollectionIds?: string[];
  targetBrandIds?: string[];
  maxDiscountAmount?: MinorUnits;
  stackable?: boolean;
}

export interface ICouponUsage extends BaseDbDocument {
  couponId: string;
  customerId: string;
  orderId?: string;
  cartId?: string;
  discountAmountMinor: MinorUnits;
  usedAt: Date;
}

// -------------------------------------------------------------
// DOMAIN 5: ORDERS
// -------------------------------------------------------------

export interface IOrderItemSnapshot {
  orderItemId?: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  brandName: string;
  size: string;
  color: string;
  image: string;
  quantity: number;
  unitPrice: MinorUnits;
  discount: MinorUnits;
  tax: MinorUnits;
  finalPrice: MinorUnits;
}

export interface IOrderAddressSnapshot {
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

export interface IOrderPricingSnapshot {
  subtotal: MinorUnits;
  discount: MinorUnits;
  couponDiscount?: MinorUnits;
  totalDiscount?: MinorUnits;
  shipping: MinorUnits;
  tax: MinorUnits;
  total: MinorUnits;
  currency: string;
}

export interface IOrderCouponSnapshot {
  code: string;
  discountMinor: MinorUnits;
  couponId?: string;
}

export interface IOrderPaymentDetailsSnapshot {
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  currency: string;
  paidAmountMinor: MinorUnits;
}

export interface IOrderCancellation {
  reason: string;
  cancelledAt: Date;
  cancelledBy: string;
  notes?: string;
}

export interface IOrder extends BaseDbDocument {
  orderNumber: string;
  customerId: string;
  checkoutSessionId?: string;
  email: string;
  phone: string;
  items: IOrderItemSnapshot[];
  pricing: IOrderPricingSnapshot;
  shippingAddress: IOrderAddressSnapshot;
  billingAddress: IOrderAddressSnapshot;
  coupon?: IOrderCouponSnapshot;
  paymentId?: string;
  paymentStatus: PaymentStatus;
  paymentDetails?: IOrderPaymentDetailsSnapshot;
  shipmentId?: string;
  status: OrderStatus;
  cancellation?: IOrderCancellation;
  notes?: string;
}

export interface IOrderStatusHistory extends BaseDbDocument {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  reason?: string;
  changedBy: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// DOMAIN 6: PAYMENTS
// -------------------------------------------------------------

export interface IPayment extends BaseDbDocument {
  customerId: string;
  checkoutSessionId: string;
  orderId?: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount: MinorUnits;
  amountMinor?: MinorUnits;
  currency: string;
  status: PaymentStatus;
  method?: string;
  attemptsCount?: number;
  metadata?: Record<string, unknown>;
}

export interface IPaymentAttempt extends BaseDbDocument {
  attemptId: string;
  paymentId: string;
  checkoutSessionId: string;
  orderId?: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount: MinorUnits;
  amountMinor?: MinorUnits;
  currency: string;
  status: PaymentStatus;
  failureCode?: string;
  failureMessage?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface IPaymentWebhookEvent extends BaseDbDocument {
  provider: string;
  eventId: string;
  eventType: string;
  paymentId?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface IPaymentStatusHistory extends BaseDbDocument {
  paymentId: string;
  fromStatus: PaymentStatus;
  toStatus: PaymentStatus;
  source: "CLIENT_VERIFY" | "WEBHOOK" | "SYSTEM" | "RECONCILIATION";
  providerEventId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IRefundCalculationSnapshot {
  originalSubtotal: MinorUnits;
  originalDiscount: MinorUnits;
  originalCouponDiscount?: MinorUnits;
  originalTax: MinorUnits;
  originalShipping: MinorUnits;
  originalTotal: MinorUnits;
  paidAmount: MinorUnits;
  previouslyRefundedAmount: MinorUnits;
  remainingRefundableBefore: MinorUnits;
  itemsRefundSubtotal: MinorUnits;
  discountDeduction: MinorUnits;
  taxRefund: MinorUnits;
  shippingRefund: MinorUnits;
  finalRefundAmount: MinorUnits;
  policyNotes?: string;
  items?: Array<{
    orderItemId: string;
    variantId?: string;
    quantity: number;
    unitPrice: MinorUnits;
    discountAllocation: MinorUnits;
    taxAllocation: MinorUnits;
    itemRefundAmount: MinorUnits;
  }>;
}

export interface IRefundAttempt {
  attemptId: string;
  provider: string;
  idempotencyKey: string;
  providerRequestId?: string;
  providerRefundId?: string;
  amount: MinorUnits;
  currency: string;
  status: RefundAttemptStatus;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface IRefundReconciliationState {
  lastCheckedAt?: Date;
  providerStatus?: string;
  mismatchDetected?: boolean;
  notes?: string;
}

export interface IRefund extends BaseDbDocument {
  refundNumber: string;
  orderId: string;
  orderNumber?: string;
  paymentId: string;
  customerId: string;
  returnRequestId?: string;
  amount: MinorUnits;
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
  initiatedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// DOMAIN 7: FULFILLMENT & SHIPPING
// -------------------------------------------------------------

export interface IFulfillmentItem {
  orderItemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string;
  size: string;
  orderedQuantity: number;
  fulfilledQuantity: number;
}

export interface IFulfillment extends BaseDbDocument {
  fulfillmentNumber: string;
  orderId: string;
  warehouseId: string;
  status: FulfillmentStatus;
  items: IFulfillmentItem[];
  assignedTo?: string;
  allocatedAt?: Date;
  pickingStartedAt?: Date;
  pickedAt?: Date;
  pickedBy?: string;
  packingStartedAt?: Date;
  packedAt?: Date;
  packedBy?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  metadata?: Record<string, unknown>;
}

export interface IPackageItem {
  orderItemId: string;
  variantId: string;
  sku: string;
  quantity: number;
}

export interface IPackage extends BaseDbDocument {
  packageNumber: string;
  fulfillmentId: string;
  orderId: string;
  items: IPackageItem[];
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  status: "CREATED" | "SEALED" | "LABELLED" | "SHIPPED";
}

export interface IShipment extends BaseDbDocument {
  shipmentNumber: string;
  orderId: string;
  fulfillmentId: string;
  packageId?: string;
  warehouseId: string;
  provider: string;
  providerShipmentId?: string;
  awbNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  serviceLevel?: string;
  estimatedDeliveryDate?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface IShipmentEvent extends BaseDbDocument {
  shipmentId: string;
  status: ShipmentStatus;
  providerStatus?: string;
  location?: string;
  description: string;
  eventTime: Date;
  source: ShipmentEventSource;
  providerEventId?: string;
  rawReference?: Record<string, unknown>;
}

export interface IShippingWebhookEvent extends BaseDbDocument {
  provider: string;
  eventId: string;
  eventType: string;
  shipmentId?: string;
  providerShipmentId?: string;
  awbNumber?: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface IServiceabilityRule extends BaseDbDocument {
  postalCode: string;
  country: string;
  serviceable: boolean;
  status: "ACTIVE" | "INACTIVE";
  city?: string;
  state?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
}

// -------------------------------------------------------------
// DOMAIN 8: RETURNS & EXCHANGES (Phase 22)
// -------------------------------------------------------------

export interface IReturnItem {
  orderItemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPriceMinor: number;
  reason: ReturnReason;
  condition?: ReturnItemCondition | string;
  inspectionResult?: InspectionResult;
  inspectionNotes?: string;
  disposition?: ReturnDisposition;
}

export interface IReturnInspection {
  inspectedBy: string;
  result: InspectionResult;
  condition: ReturnItemCondition | string;
  notes?: string;
  evidence?: string[];
  inspectedAt: Date;
}

export interface IReturnShipment {
  provider: string;
  providerShipmentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: string;
  scheduledPickupDate?: Date;
  actualPickupDate?: Date;
  failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReturnPolicySnapshot {
  returnWindowDays: number;
  deliveredAt: Date;
  policyVersion: string;
  eligibleAmountMinor: number;
}

export interface IReturnRequest extends BaseDbDocument {
  returnNumber: string;
  orderId: string;
  customerId: string;
  type: ReturnType;
  reason: ReturnReason;
  description?: string;
  evidenceImages: string[];
  status: ReturnStatus;
  pickupAddressSnapshot: IOrderAddressSnapshot;
  warehouseId?: string;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  pickupScheduledAt?: Date;
  pickedUpAt?: Date;
  receivedAt?: Date;
  receivedBy?: string;
  inspectedAt?: Date;
  inspectedBy?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  items: IReturnItem[];
  returnShipment?: IReturnShipment;
  policySnapshot?: IReturnPolicySnapshot;
  refundRequestedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface IExchangeRequest extends BaseDbDocument {
  exchangeNumber: string;
  returnRequestId?: string;
  orderId: string;
  customerId: string;
  originalItem: {
    orderItemId: string;
    variantId: string;
    productId?: string;
    sku?: string;
    productName?: string;
    quantity: number;
    unitPriceMinor?: number;
  };
  requestedVariantId: string;
  replacementProductId?: string;
  replacementSku?: string;
  replacementSize?: string;
  replacementColor?: string;
  quantity: number;
  reason: ReturnReason;
  status: ExchangeStatus;
  reservationId?: string;
  fulfillmentId?: string;
  replacementOrderId?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// DOMAIN 9: REVIEWS
// -------------------------------------------------------------

export interface IReviewMedia {
  url: string;
  mediaType: "IMAGE" | "VIDEO";
  sortOrder: number;
}

export interface IReviewVariantSnapshot {
  color?: string;
  size?: string;
  sku?: string;
}

export interface IReview extends BaseDbDocument {
  customerId: string;
  productId: string;
  orderId?: string;
  orderItemId?: string;
  variantId?: string;
  variantSnapshot?: IReviewVariantSnapshot;
  rating: number;
  title: string;
  comment: string;
  media: IReviewMedia[];
  verifiedPurchase: boolean;
  verifiedAt?: Date;
  status: ReviewStatus;
  moderationReason?: ReviewModerationReason | string;
  moderatorNotes?: string;
  helpfulCount: number;
  reportCount: number;
  customerDisplayName?: string;
  publishedAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface IReviewVote extends BaseDbDocument {
  reviewId: string;
  customerId: string;
}

export interface IReviewReport extends BaseDbDocument {
  reviewId: string;
  customerId: string;
  reason: ReviewReportReason;
  comment?: string;
  status: ReviewReportStatus;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface IProductRatingAggregate extends BaseDbDocument {
  productId: string;
  averageRating: number;
  ratingCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
  withPhotosCount: number;
  lastCalculatedAt: Date;
}

// -------------------------------------------------------------
// DOMAIN 10: COMMUNICATION (Phase 25)
// -------------------------------------------------------------

export interface INotification extends BaseDbDocument {
  customerId: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  data?: Record<string, unknown>;
  eventId?: string;
  eventType?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
  actionUrl?: string;
  readAt?: Date | null;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreference extends BaseDbDocument {
  customerId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
  inApp: boolean;
  orderUpdates: boolean;
  paymentUpdates: boolean;
  shippingUpdates: boolean;
  returnRefundUpdates: boolean;
  reviewUpdates: boolean;
  securityAlerts: boolean;
  marketing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDeliveryAttempt extends BaseDbDocument {
  notificationId: string;
  eventId?: string;
  customerId: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  attemptNumber: number;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  idempotencyKey: string;
  attemptedAt: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
}

export interface IEmailEvent extends BaseDbDocument {
  notificationId?: string;
  eventId?: string;
  customerId?: string;
  orderId?: string;
  recipientEmail: string;
  template: string;
  provider: string;
  providerMessageId?: string;
  status: EmailEventStatus;
  attemptNumber?: number;
  idempotencyKey?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  failedAt?: Date;
  error?: string;
}

// -------------------------------------------------------------
// DOMAIN 11: CUSTOMER SUPPORT
// -------------------------------------------------------------

export interface ISupportAttachment {
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface ISupportTicket extends BaseDbDocument {
  ticketNumber: string;
  customerId: string;
  category: SupportCategory;
  subject: string;
  priority: SupportPriority;
  status: SupportTicketStatus;
  assignedTo?: string;
  assignedStaffId?: string; // Backwards compatibility alias
  assignedTeam?: string;
  orderId?: string;
  relatedOrderId?: string; // Backwards compatibility alias
  shipmentId?: string;
  returnRequestId?: string;
  refundId?: string;
  productId?: string;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  reopenedAt?: Date | null;
  lastMessageAt: Date;
  slaFirstResponseDeadline?: Date | null;
  slaResolutionDeadline?: Date | null;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupportMessage extends BaseDbDocument {
  ticketId: string;
  senderType: SupportSenderType;
  senderId: string;
  senderDisplayName?: string;
  messageType: SupportMessageType;
  body: string;
  message?: string; // Backwards compatibility alias
  attachments: ISupportAttachment[];
  isInternal: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// -------------------------------------------------------------
// DOMAIN 12: CONTENT MANAGEMENT
// -------------------------------------------------------------

export interface IBanner extends BaseDbDocument {
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  ctaText?: string;
  ctaUrl?: string;
  placement: string;
  startAt?: Date;
  endAt?: Date;
  active: boolean;
  sortOrder: number;
}

export interface IHomepageSection extends BaseDbDocument {
  sectionType: string;
  title: string;
  subtitle?: string;
  contentReferences?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  sortOrder: number;
  active: boolean;
}

export interface IEditorialStory extends BaseDbDocument, SoftDeletable {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  heroImage: string;
  author?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: Date | null;
  readingTimeMinutes?: number;
  sortOrder: number;
  active: boolean;
  seo?: ISeoMetadata;
}

// -------------------------------------------------------------
// DOMAIN 13: ADMINISTRATION
// -------------------------------------------------------------

export interface IAuditLog extends BaseDbDocument {
  actorId: string;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ISystemSettings extends BaseDbDocument {
  key: string;
  category: SystemSettingsCategory;
  value: Record<string, unknown>;
  description?: string;
  isEncrypted?: boolean;
  updatedBy?: string;
}
