/**
 * VÉRONA — Cart Domain Types & Data Transfer Objects
 *
 * Strict, typed presentation contracts ensuring zero leakage of internal Mongoose
 * documents and guarantees type-safety across API, Services, and UI layers.
 */

import { CartStatus } from "@/constants/status";
import { MinorUnits } from "@/types/database";

export type CartItemAvailability =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "PRICE_CHANGED"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE";

export interface CartItemDTO {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  productName: string;
  slug: string;
  image: string;
  brand: string;
  selectedColor: string;
  selectedSize: string;
  sku: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
  unitPriceMajor: number;
  lineTotalMinor: MinorUnits;
  lineTotalMajor: number;
  priceChanged: boolean;
  previousPriceMinor?: MinorUnits;
  previousPriceMajor?: number;
  availability: CartItemAvailability;
  createdAt: string;
  updatedAt: string;
}

import { PricingBreakdownDTO } from "@/modules/pricing/pricing.types";

export interface CartTotalsDTO {
  subtotalMinor: MinorUnits;
  subtotalMajor: number;
  promotionDiscountMinor: MinorUnits;
  promotionDiscountMajor: number;
  couponDiscountMinor: MinorUnits;
  couponDiscountMajor: number;
  discountMinor: MinorUnits;
  discountMajor: number;
  shippingMinor: MinorUnits;
  taxMinor: MinorUnits;
  grandTotalMinor: MinorUnits;
  grandTotalMajor: number;
  currency: string;
}

export interface CartDTO {
  id: string;
  customerId?: string;
  sessionId?: string;
  status: CartStatus;
  items: CartItemDTO[];
  /** Total sum of all garment quantities in the cart (e.g. 2 shirts + 1 trouser = 3) */
  itemCount: number;
  /** Number of distinct line items */
  distinctItemCount: number;
  totals: CartTotalsDTO;
  couponCode?: string | null;
  pricingBreakdown?: PricingBreakdownDTO;
  couponValidationMessage?: string | null;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartInput {
  productId: string;
  variantId: string;
  quantity?: number;
}

export interface UpdateQuantityInput {
  quantity: number;
}
