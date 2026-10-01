/**
 * VÉRONA — Return State Machine (Phase 22)
 *
 * Deterministic transition registry and guard evaluations for return requests.
 * Prevents arbitrary status mutations.
 */

import { ReturnStatus } from "@/constants/status";
import { ConflictError } from "@/lib/errors";

export interface ReturnTransitionRule {
  from: ReturnStatus;
  to: ReturnStatus[];
  description: string;
}

export const VALID_RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  [ReturnStatus.REQUESTED]: [
    ReturnStatus.UNDER_REVIEW,
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
    ReturnStatus.CANCELLED,
  ],
  [ReturnStatus.UNDER_REVIEW]: [
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
    ReturnStatus.CANCELLED,
  ],
  [ReturnStatus.APPROVED]: [
    ReturnStatus.PICKUP_SCHEDULED,
    ReturnStatus.PICKED_UP,
    ReturnStatus.RECEIVED,
    ReturnStatus.CANCELLED,
  ],
  [ReturnStatus.PICKUP_SCHEDULED]: [
    ReturnStatus.PICKED_UP,
    ReturnStatus.PICKUP_SCHEDULED, // reschedule
    ReturnStatus.IN_TRANSIT,
    ReturnStatus.RECEIVED,
    ReturnStatus.CANCELLED,
  ],
  [ReturnStatus.PICKED_UP]: [
    ReturnStatus.IN_TRANSIT,
    ReturnStatus.RECEIVED,
  ],
  [ReturnStatus.IN_TRANSIT]: [
    ReturnStatus.RECEIVED,
  ],
  [ReturnStatus.RECEIVED]: [
    ReturnStatus.INSPECTION,
    ReturnStatus.INSPECTING,
  ],
  [ReturnStatus.INSPECTING]: [
    ReturnStatus.APPROVED_FOR_SETTLEMENT,
    ReturnStatus.APPROVED_FOR_REFUND,
    ReturnStatus.REJECTED,
    ReturnStatus.COMPLETED,
  ],
  [ReturnStatus.INSPECTION]: [
    ReturnStatus.APPROVED_FOR_SETTLEMENT,
    ReturnStatus.APPROVED_FOR_REFUND,
    ReturnStatus.REJECTED,
    ReturnStatus.COMPLETED,
  ],
  [ReturnStatus.APPROVED_FOR_SETTLEMENT]: [
    ReturnStatus.REFUND_INITIATED,
    ReturnStatus.COMPLETED,
  ],
  [ReturnStatus.APPROVED_FOR_REFUND]: [
    ReturnStatus.REFUND_INITIATED,
    ReturnStatus.COMPLETED,
  ],
  [ReturnStatus.REFUND_INITIATED]: [
    ReturnStatus.COMPLETED,
  ],
  [ReturnStatus.COMPLETED]: [],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.CANCELLED]: [],
};

export const TERMINAL_RETURN_STATES: ReadonlySet<ReturnStatus> = new Set([
  ReturnStatus.COMPLETED,
  ReturnStatus.REJECTED,
  ReturnStatus.CANCELLED,
]);

export const CANCELLABLE_RETURN_STATES: ReadonlySet<ReturnStatus> = new Set([
  ReturnStatus.REQUESTED,
  ReturnStatus.UNDER_REVIEW,
  ReturnStatus.APPROVED,
  ReturnStatus.PICKUP_SCHEDULED,
]);

export class ReturnStateMachine {
  /**
   * Validate whether a transition from one status to another is legal.
   */
  static isValidTransition(currentStatus: ReturnStatus, nextStatus: ReturnStatus): boolean {
    const allowed = VALID_RETURN_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(nextStatus);
  }

  /**
   * Assert transition validity; throws ConflictError on invalid transition.
   */
  static assertValidTransition(
    currentStatus: ReturnStatus,
    nextStatus: ReturnStatus,
    returnNumber?: string
  ): void {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      const ref = returnNumber ? ` for Return ${returnNumber}` : "";
      throw new ConflictError(
        `Invalid return status transition${ref}: cannot transition from "${currentStatus}" to "${nextStatus}".`
      );
    }
  }

  /**
   * Check if return status is terminal.
   */
  static isTerminal(status: ReturnStatus): boolean {
    return TERMINAL_RETURN_STATES.has(status);
  }

  /**
   * Check if return request can be cancelled by customer or staff.
   */
  static isCancellable(status: ReturnStatus): boolean {
    return CANCELLABLE_RETURN_STATES.has(status);
  }
}
