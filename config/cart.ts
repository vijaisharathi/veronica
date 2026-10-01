/**
 * VÉRONA — Cart Configuration Constants
 *
 * Centralized business constraints and configuration tokens for the Cart domain.
 */

export const CART_CONFIG = {
  /** Maximum quantity allowed for a single product variant in the cart */
  MAX_CART_ITEM_QUANTITY: 10,
  /** Minimum quantity allowed when adding or updating an item */
  MIN_CART_ITEM_QUANTITY: 1,
  /** Base currency code */
  CURRENCY: "INR",
  /** Locale for formatting */
  LOCALE: "en-IN",
  /** Session cookie identifier shared across guest cart and browsing history */
  SESSION_COOKIE_NAME: "verona_session_id",
} as const;

export const MAX_CART_ITEM_QUANTITY = CART_CONFIG.MAX_CART_ITEM_QUANTITY;
export const MIN_CART_ITEM_QUANTITY = CART_CONFIG.MIN_CART_ITEM_QUANTITY;
