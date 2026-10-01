/**
 * VÉRONA — Core Application Constants
 *
 * System-wide constants, branding identifiers, and architectural parameters.
 */

export const APP_CONFIG = {
  NAME: "VÉRONA",
  TAGLINE: "Curated Haute Couture & Contemporary Fashion",
  API_VERSION: "v1",
  DEFAULT_LOCALE: "en-IN",
  CURRENCY: "INR",
  CURRENCY_SYMBOL: "₹",
} as const;

export const HTTP_HEADERS = {
  REQUEST_ID: "x-request-id",
  CORRELATION_ID: "x-correlation-id",
  RESPONSE_TIME: "x-response-time",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
