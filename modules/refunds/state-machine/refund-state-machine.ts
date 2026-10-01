/**
 * VÉRONA — Refund Domain Canonical State Machine
 *
 * Enforces authoritative transition invariants across the entire refund lifecycle.
 * Prevents invalid state jumps, protects terminal completion, and provides
 * mapping from external payment provider responses to canonical domain states.
 */

import { RefundStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

export const REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  [RefundStatus.REQUESTED]: [
    RefundStatus.ELIGIBLE,
    RefundStatus.FAILED,
  ],
  [RefundStatus.ELIGIBLE]: [
    RefundStatus.INITIATED,
    RefundStatus.FAILED,
  ],
  [RefundStatus.INITIATED]: [
    RefundStatus.PROCESSING,
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
    RefundStatus.RECONCILIATION_REQUIRED,
  ],
  [RefundStatus.PROCESSING]: [
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
    RefundStatus.RECONCILIATION_REQUIRED,
  ],
  [RefundStatus.COMPLETED]: [], // Strict terminal state
  [RefundStatus.FAILED]: [
    RefundStatus.RETRY_PENDING,
    RefundStatus.RECONCILIATION_REQUIRED,
  ],
  [RefundStatus.RETRY_PENDING]: [
    RefundStatus.INITIATED,
    RefundStatus.FAILED,
  ],
  [RefundStatus.RECONCILIATION_REQUIRED]: [
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
    RefundStatus.PROCESSING,
  ],
  [RefundStatus.PENDING]: [
    RefundStatus.ELIGIBLE,
    RefundStatus.FAILED,
  ],
  [RefundStatus.CANCELLED]: [],
};

/**
 * Validates whether a state transition is permitted.
 */
export function canTransitionRefund(
  currentStatus: RefundStatus,
  targetStatus: RefundStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = REFUND_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Asserts valid transition, throwing a structured REFUND_STATE_CONFLICT error if illegal.
 */
export function assertValidRefundTransition(
  currentStatus: RefundStatus,
  targetStatus: RefundStatus
): void {
  if (!canTransitionRefund(currentStatus, targetStatus)) {
    throw new AppError(
      `Illegal refund transition from ${currentStatus} to ${targetStatus}`,
      "REFUND_STATE_CONFLICT",
      409
    );
  }
}

/**
 * Authoritative mapper for external payment gateway refund statuses.
 * Maps provider strings (e.g. Razorpay 'processed', 'pending', 'failed') to canonical domain states.
 */
export class RefundStatusMapper {
  static fromProviderStatus(providerStatus?: string): RefundStatus {
    if (!providerStatus) return RefundStatus.PROCESSING;

    const normalized = providerStatus.toLowerCase().trim();
    switch (normalized) {
      case "processed":
      case "completed":
      case "succeeded":
      case "success":
        return RefundStatus.COMPLETED;

      case "failed":
      case "rejected":
      case "cancelled":
        return RefundStatus.FAILED;

      case "pending":
      case "submitted":
      case "initiated":
      default:
        return RefundStatus.PROCESSING;
    }
  }
}
