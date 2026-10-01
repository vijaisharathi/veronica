/**
 * VÉRONA — Exchange State Machine (Phase 22)
 *
 * Deterministic transition registry and guard evaluations for exchange requests.
 * Prevents arbitrary status mutations and ensures replacement fulfillment
 * only triggers after required return conditions.
 */

import { ExchangeStatus } from "@/constants/status";
import { ConflictError } from "@/lib/errors";

export const VALID_EXCHANGE_TRANSITIONS: Record<ExchangeStatus, readonly ExchangeStatus[]> = {
  [ExchangeStatus.REQUESTED]: [
    ExchangeStatus.UNDER_REVIEW,
    ExchangeStatus.APPROVED,
    ExchangeStatus.REJECTED,
    ExchangeStatus.CANCELLED,
  ],
  [ExchangeStatus.UNDER_REVIEW]: [
    ExchangeStatus.APPROVED,
    ExchangeStatus.REJECTED,
    ExchangeStatus.CANCELLED,
  ],
  [ExchangeStatus.APPROVED]: [
    ExchangeStatus.RETURN_PENDING,
    ExchangeStatus.ITEM_RECEIVED,
    ExchangeStatus.EXCHANGE_APPROVED,
    ExchangeStatus.REJECTED,
    ExchangeStatus.CANCELLED,
  ],
  [ExchangeStatus.RETURN_PENDING]: [
    ExchangeStatus.ITEM_RECEIVED,
    ExchangeStatus.CANCELLED,
  ],
  [ExchangeStatus.ITEM_RECEIVED]: [
    ExchangeStatus.EXCHANGE_APPROVED,
    ExchangeStatus.REJECTED,
  ],
  [ExchangeStatus.EXCHANGE_APPROVED]: [
    ExchangeStatus.FULFILLMENT_PENDING,
    ExchangeStatus.FULFILLED,
    ExchangeStatus.EXCHANGED,
  ],
  [ExchangeStatus.FULFILLMENT_PENDING]: [
    ExchangeStatus.FULFILLED,
    ExchangeStatus.EXCHANGED,
  ],
  [ExchangeStatus.FULFILLED]: [
    ExchangeStatus.COMPLETED,
    ExchangeStatus.EXCHANGED,
  ],
  [ExchangeStatus.EXCHANGED]: [
    ExchangeStatus.COMPLETED,
  ],
  [ExchangeStatus.COMPLETED]: [],
  [ExchangeStatus.REJECTED]: [],
  [ExchangeStatus.CANCELLED]: [],
};

export const TERMINAL_EXCHANGE_STATES: ReadonlySet<ExchangeStatus> = new Set([
  ExchangeStatus.COMPLETED,
  ExchangeStatus.REJECTED,
  ExchangeStatus.CANCELLED,
]);

export const CANCELLABLE_EXCHANGE_STATES: ReadonlySet<ExchangeStatus> = new Set([
  ExchangeStatus.REQUESTED,
  ExchangeStatus.UNDER_REVIEW,
  ExchangeStatus.APPROVED,
  ExchangeStatus.RETURN_PENDING,
]);

export class ExchangeStateMachine {
  /**
   * Validate whether a transition from one status to another is legal.
   */
  static isValidTransition(currentStatus: ExchangeStatus, nextStatus: ExchangeStatus): boolean {
    const allowed = VALID_EXCHANGE_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(nextStatus);
  }

  /**
   * Assert transition validity; throws ConflictError on invalid transition.
   */
  static assertValidTransition(
    currentStatus: ExchangeStatus,
    nextStatus: ExchangeStatus,
    exchangeNumber?: string
  ): void {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      const ref = exchangeNumber ? ` for Exchange ${exchangeNumber}` : "";
      throw new ConflictError(
        `Invalid exchange status transition${ref}: cannot transition from "${currentStatus}" to "${nextStatus}".`
      );
    }
  }

  /**
   * Check if exchange status is terminal.
   */
  static isTerminal(status: ExchangeStatus): boolean {
    return TERMINAL_EXCHANGE_STATES.has(status);
  }

  /**
   * Check if exchange request can be cancelled.
   */
  static isCancellable(status: ExchangeStatus): boolean {
    return CANCELLABLE_EXCHANGE_STATES.has(status);
  }
}
