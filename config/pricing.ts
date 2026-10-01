/**
 * VÉRONA — Pricing & Discount Configuration Constants
 *
 * Centralized business constraints, rounding rules, and limits for the Pricing & Coupon domain.
 */

export const PRICING_CONFIG = {
  /** Base currency token */
  CURRENCY: "INR",
  /** Locale for formatting */
  LOCALE: "en-IN",
  /** Maximum percentage discount permitted (1-100%) */
  MAX_PERCENTAGE_DISCOUNT: 100,
  /** Minimum percentage discount (1%) */
  MIN_PERCENTAGE_DISCOUNT: 1,
  /** Minimum fixed amount discount in paise (₹1.00) */
  MIN_FIXED_DISCOUNT_PAISE: 100,
  /** Minimum coupon code character length */
  MIN_COUPON_CODE_LENGTH: 3,
  /** Maximum coupon code character length */
  MAX_COUPON_CODE_LENGTH: 30,
  /** Default per-customer redemption limit if not specified */
  DEFAULT_PER_CUSTOMER_LIMIT: 1,
} as const;
