/**
 * VÉRONA — Support Ticket Number Generator (Phase 26)
 *
 * Generates human-readable, non-guessable, server-authoritative support ticket numbers.
 * Format: SUP-YYYY-XXXXXX (e.g., SUP-2026-A48B2C)
 */

import crypto from "node:crypto";

/**
 * Generates a unique, customer-safe support ticket number.
 * Uses cryptographically secure random bytes to prevent enumeration attacks.
 */
export function generateTicketNumber(year: number = new Date().getFullYear()): string {
  const entropy = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SUP-${year}-${entropy}`;
}
