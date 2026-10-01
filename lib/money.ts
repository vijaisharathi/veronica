/**
 * VÉRONA — Centralized Money & Pricing Formatter
 *
 * All monetary amounts are represented as integer minor units (paise for INR).
 * Example: ₹999.00 = 99900 paise.
 * Never use floating-point arithmetic for currency source calculations.
 */

export interface FormatMoneyOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format integer minor units (paise) to human-readable currency string.
 * Example: 99900 -> "₹999" (or "₹999.00" if fraction digits specified)
 */
export function formatMoney(
  amountInMinorUnits: number,
  optionsOrCurrency: FormatMoneyOptions | string = {}
): string {
  const options =
    typeof optionsOrCurrency === "string"
      ? { currency: optionsOrCurrency }
      : optionsOrCurrency;

  const {
    locale = "en-IN",
    currency = "INR",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  const major = Math.round(amountInMinorUnits / 100);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(major);
}

/**
 * Convert integer minor units (paise) to integer major units (rupees).
 * Example: 149900 -> 1499
 */
export function minorToMajor(amountInMinorUnits: number): number {
  return Math.round(amountInMinorUnits / 100);
}

/**
 * Convert major units (rupees) to integer minor units (paise).
 * Example: 1499 -> 149900
 */
export function majorToMinor(amountInMajorUnits: number): number {
  return Math.round(amountInMajorUnits * 100);
}

/**
 * Calculate deterministic discount percentage from MRP and Selling Price (both in minor units).
 * Returns 0 if MRP <= sellingPrice or MRP <= 0.
 */
export function calculateDiscountPercent(
  mrpInMinorUnits: number,
  sellingPriceInMinorUnits: number
): number {
  if (mrpInMinorUnits <= 0 || sellingPriceInMinorUnits >= mrpInMinorUnits) {
    return 0;
  }
  const discount = Math.round(
    ((mrpInMinorUnits - sellingPriceInMinorUnits) / mrpInMinorUnits) * 100
  );
  return Math.max(0, Math.min(100, discount));
}
