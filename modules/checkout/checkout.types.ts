/**
 * VÉRONA — Checkout Domain Types & Presentation Contracts
 *
 * Implements the authoritative contracts for Phase 17 Checkout.
 * Provides locked DTOs for client presentation, pre-payment validation,
 * and the frozen payment-ready handoff contract for Phase 18.
 */

import { CheckoutSessionStatus } from "@/constants/status";
import { ServiceabilityState, ServiceabilitySource } from "@/modules/delivery/delivery.types";
import { MinorUnits } from "@/types/database";

export { CheckoutSessionStatus };

export const CheckoutIssueCode = {
  CART_EMPTY: "CART_EMPTY",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  VARIANT_UNAVAILABLE: "VARIANT_UNAVAILABLE",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  PRICE_CHANGED: "PRICE_CHANGED",
  COUPON_INVALID: "COUPON_INVALID",
  COUPON_EXPIRED: "COUPON_EXPIRED",
  ADDRESS_REQUIRED: "ADDRESS_REQUIRED",
  ADDRESS_INVALID: "ADDRESS_INVALID",
  DELIVERY_NOT_SERVICEABLE: "DELIVERY_NOT_SERVICEABLE",
  SERVICEABILITY_UNAVAILABLE: "SERVICEABILITY_UNAVAILABLE",
  CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED",
} as const;

export type CheckoutIssueCode = (typeof CheckoutIssueCode)[keyof typeof CheckoutIssueCode];

export interface CheckoutIssue {
  code: CheckoutIssueCode;
  message: string;
  field?: string;
  details?: unknown;
  recoverable: boolean;
}

export interface CheckoutAddressSnapshot {
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

export interface CheckoutServiceabilitySnapshot {
  postalCode: string;
  serviceable: boolean;
  state: ServiceabilityState;
  city?: string;
  stateName?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
  source: ServiceabilitySource;
  checkedAt: string;
}

export interface CheckoutItemDTO {
  itemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  brandName: string;
  size: string;
  colorName: string;
  colorHex: string;
  image: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
  unitPriceMajor: number;
  unitMrpMinor: MinorUnits;
  unitMrpMajor: number;
  lineSubtotalMinor: MinorUnits;
  lineSubtotalMajor: number;
  lineDiscountMinor: MinorUnits;
  lineDiscountMajor: number;
  lineTotalMinor: MinorUnits;
  lineTotalMajor: number;
  priceChanged: boolean;
  previousPriceMinor?: MinorUnits;
  previousPriceMajor?: number;
}

export interface CheckoutPricingSummaryDTO {
  subtotalMinor: MinorUnits;
  subtotalMajor: number;
  promotionDiscountMinor: MinorUnits;
  promotionDiscountMajor: number;
  couponDiscountMinor: MinorUnits;
  couponDiscountMajor: number;
  totalDiscountMinor: MinorUnits;
  totalDiscountMajor: number;
  amountDueBeforePaymentMinor: MinorUnits; // Canonical authoritative field
  amountDueBeforePaymentMajor: number;
  currency: string;
  pricingVersion: string;
  calculatedAt: string;
}

/**
 * Stable, locked contract produced for Phase 18 Payment Gateway.
 */
export interface PaymentReadyCheckout {
  checkoutSessionId: string;
  customerId: string;
  cartId: string;
  currency: string;
  amountMinor: MinorUnits;
  pricingVersion: string;
  addressSnapshot: CheckoutAddressSnapshot;
  serviceabilitySnapshot: CheckoutServiceabilitySnapshot;
  items: CheckoutItemDTO[];
  appliedCouponCode?: string | null;
}

export interface CheckoutDTO {
  id: string;
  customerId: string;
  cartId: string;
  status: CheckoutSessionStatus;
  selectedAddressId?: string;
  addressSnapshot?: CheckoutAddressSnapshot;
  items: CheckoutItemDTO[];
  pricing: CheckoutPricingSummaryDTO;
  appliedCoupon?: {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
  } | null;
  serviceability?: CheckoutServiceabilitySnapshot | null;
  issues: CheckoutIssue[];
  isValid: boolean;
  canProceedToPayment: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectAddressInput {
  addressId: string;
}
