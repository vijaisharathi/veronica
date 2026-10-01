/**
 * VÉRONA — Pricing & Discount Types & DTOs
 *
 * Strongly-typed definitions for the authoritative pricing engine,
 * promotions, coupon validation, and pricing breakdowns.
 */

import { DiscountType, CampaignStatus } from "@/constants/status";
import { MinorUnits } from "@/types/database";

export interface PricingItemInput {
  productId: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
  categoryIds?: string[];
  collectionIds?: string[];
  brandId?: string;
  productName?: string;
  sku?: string;
}

export interface PricingContext {
  items: PricingItemInput[];
  customerId?: string;
  guestSessionId?: string;
  couponCode?: string | null;
  timestamp?: Date;
}

export interface PricingItemBreakdown {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  mrpMinor: MinorUnits;
  unitPriceMinor: MinorUnits; // Base catalog selling price
  unitPriceMajor: number;
  lineSubtotalMinor: MinorUnits; // unitPriceMinor * quantity
  lineSubtotalMajor: number;
  itemPromotionDiscountMinor: MinorUnits;
  itemPromotionDiscountMajor: number;
  itemCouponDiscountMinor: MinorUnits;
  itemCouponDiscountMajor: number;
  itemTotalDiscountMinor: MinorUnits;
  itemTotalDiscountMajor: number;
  finalLineTotalMinor: MinorUnits; // lineSubtotalMinor - itemTotalDiscountMinor (floor at 0)
  finalLineTotalMajor: number;
  appliedPromotion?: {
    id: string;
    campaignId?: string;
    name: string;
    type: DiscountType;
    value: number;
  } | null;
}

export interface AppliedCouponDTO {
  id: string;
  couponId?: string;
  code: string;
  type: DiscountType;
  value: number;
  description?: string;
  discountAmountMinor: MinorUnits;
  discountAmountMajor: number;
}

export interface PricingBreakdownDTO {
  currency: string;
  items: PricingItemBreakdown[];
  itemCount: number;
  subtotalMinor: MinorUnits; // Sum of lineSubtotalMinor (base prices)
  subtotalMajor: number;
  promotionDiscountMinor: MinorUnits; // Sum of promotional discounts
  promotionDiscountMajor: number;
  couponDiscountMinor: MinorUnits; // Total discount from coupon
  couponDiscountMajor: number;
  totalDiscountMinor: MinorUnits; // promotionDiscountMinor + couponDiscountMinor
  totalDiscountMajor: number;
  grandTotalMinor: MinorUnits; // max(0, subtotalMinor - totalDiscountMinor)
  grandTotalMajor: number;
  appliedCoupon?: AppliedCouponDTO | null;
  couponValidationMessage?: string | null;
}

export interface ProductPricingDTO {
  productId: string;
  variantId?: string;
  mrpMinor: MinorUnits;
  mrpMajor: number;
  sellingPriceMinor: MinorUnits;
  sellingPriceMajor: number;
  hasPromotion: boolean;
  promotionDiscountMinor: MinorUnits;
  promotionDiscountMajor: number;
  effectivePriceMinor: MinorUnits;
  effectivePriceMajor: number;
  discountPercent: number;
  appliedPromotion?: {
    id: string;
    campaignId?: string;
    name: string;
    type: DiscountType;
    value: number;
  } | null;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string;
  couponId?: string;
  discountMinor: MinorUnits;
  errorCode?: string;
  errorMessage?: string;
  eligibleItemIds?: string[];
  description?: string;
  type?: DiscountType;
  value?: number;
  coupon?: {
    id: string;
    code: string;
    type: DiscountType;
    value: number;
    description?: string;
  };
}

export interface CouponDTO {
  id: string;
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  minCartValue: MinorUnits;
  minCartValueMajor: number;
  maxDiscountAmount?: MinorUnits | null;
  maxDiscountAmountMajor?: number | null;
  usageLimit?: number | null;
  perCustomerUsageLimit: number;
  usageCount: number;
  startAt: string;
  expiresAt: string;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  applicableBrandIds: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  active: boolean;
  stackable: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  banner?: string;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
  priority: number;
  discountType: DiscountType;
  discountValue: number;
  targetCategoryIds: string[];
  targetProductIds: string[];
  targetCollectionIds: string[];
  targetBrandIds: string[];
  maxDiscountAmount?: MinorUnits | null;
  stackable: boolean;
  createdAt: string;
  updatedAt: string;
}
