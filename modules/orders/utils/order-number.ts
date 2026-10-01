/**
 * VÉRONA — Order Number Generator (Phase 19)
 *
 * Generates human-readable, non-guessable, server-authoritative order numbers.
 * Format: VRN-YYYY-XXXXXX (e.g., VRN-2026-A48B2C)
 */

import crypto from "node:crypto";

/**
 * Generates a unique, human-readable order number for VÉRONA.
 * Uses cryptographically secure random bytes to prevent sequential enumeration / guessing.
 */
export function generateOrderNumber(year: number = new Date().getFullYear()): string {
  // 3 bytes produces a 6-character hexadecimal string with 16,777,216 entropy space per year
  const entropy = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `VRN-${year}-${entropy}`;
}
