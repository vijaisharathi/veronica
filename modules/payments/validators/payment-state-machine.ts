/**
 * VÉRONA — Payment State Machine & Transition Validator
 *
 * Enforces legal state transitions across the payment lifecycle.
 * Prevents illegal state jumps (e.g. FAILED -> CAPTURED or CREATED -> CAPTURED).
 */

import { PaymentStatus } from "@/constants/status";
import { ValidationError } from "@/lib/errors";

export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PENDING,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.PENDING]: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
    PaymentStatus.UNKNOWN,
  ],
  [PaymentStatus.AUTHORIZED]: [
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.UNKNOWN,
  ],
  [PaymentStatus.CAPTURED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
  ],
  [PaymentStatus.FAILED]: [
    PaymentStatus.PENDING, // Allowed when customer retries with a new attempt
  ],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.EXPIRED]: [
    PaymentStatus.PENDING, // Allowed when customer restarts session
  ],
  [PaymentStatus.UNKNOWN]: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.PARTIALLY_REFUNDED]: [
    PaymentStatus.REFUNDED,
  ],
};

/**
 * Validates whether transitioning from `currentStatus` to `nextStatus` is permissible.
 */
export function isValidPaymentTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus
): boolean {
  if (currentStatus === nextStatus) return true; // Idempotent same-state transition
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Asserts legal state transition or throws a ValidationError.
 */
export function assertValidPaymentTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus
): void {
  if (!isValidPaymentTransition(currentStatus, nextStatus)) {
    throw new ValidationError(
      `Illegal payment state transition from ${currentStatus} to ${nextStatus}`,
      { currentStatus, nextStatus }
    );
  }
}
