/**
 * VÉRONA — Fulfillment State Machine (Phase 21)
 *
 * Deterministic finite state machine governing fulfillment lifecycle transitions.
 */

import { FulfillmentStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

export const VALID_FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  [FulfillmentStatus.PENDING]: [
    FulfillmentStatus.READY_FOR_FULFILLMENT,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.READY_FOR_FULFILLMENT]: [
    FulfillmentStatus.ALLOCATED,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.ALLOCATED]: [
    FulfillmentStatus.PICKING,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.PICKING]: [
    FulfillmentStatus.PICKED,
    FulfillmentStatus.FAILED,
  ],
  [FulfillmentStatus.PICKED]: [
    FulfillmentStatus.PACKING,
  ],
  [FulfillmentStatus.PACKING]: [
    FulfillmentStatus.PACKED,
    FulfillmentStatus.FAILED,
  ],
  [FulfillmentStatus.PACKED]: [
    FulfillmentStatus.SHIPMENT_CREATED,
  ],
  [FulfillmentStatus.SHIPMENT_CREATED]: [
    FulfillmentStatus.COMPLETED,
    FulfillmentStatus.FAILED,
  ],
  [FulfillmentStatus.COMPLETED]: [],
  [FulfillmentStatus.CANCELLED]: [],
  [FulfillmentStatus.FAILED]: [],
};

export const TERMINAL_FULFILLMENT_STATES: ReadonlySet<FulfillmentStatus> = new Set([
  FulfillmentStatus.COMPLETED,
  FulfillmentStatus.CANCELLED,
  FulfillmentStatus.FAILED,
]);

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_FULFILLMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function assertValidFulfillmentTransition(from: FulfillmentStatus, to: FulfillmentStatus): void {
  if (!canTransitionFulfillment(from, to)) {
    throw new AppError(
      `Illegal fulfillment transition: cannot move from '${from}' to '${to}'.`,
      "INVALID_FULFILLMENT_STATE",
      400
    );
  }
}

export function isTerminalFulfillmentState(status: FulfillmentStatus): boolean {
  return TERMINAL_FULFILLMENT_STATES.has(status);
}

export const CANCELLABLE_FULFILLMENT_STATES: ReadonlySet<FulfillmentStatus> = new Set([
  FulfillmentStatus.PENDING,
  FulfillmentStatus.READY_FOR_FULFILLMENT,
  FulfillmentStatus.ALLOCATED,
]);

export function isCancellableFulfillmentState(status: FulfillmentStatus): boolean {
  return CANCELLABLE_FULFILLMENT_STATES.has(status);
}
