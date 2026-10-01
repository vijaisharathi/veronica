/**
 * VÉRONA — Centralized Order State Machine (Phase 19)
 *
 * Deterministic finite state machine governing order lifecycle transitions.
 * Guarantees that illegal state mutations are rejected, terminal states are
 * protected, and customer cancellation rights are strictly verified.
 */

import { OrderStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";
import { IOrder } from "@/types/database";

/**
 * Valid state transition adjacency matrix.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
    OrderStatus.PAYMENT_FAILED,
  ],
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
    OrderStatus.PAYMENT_FAILED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PACKED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.RETURN_REQUESTED,
  ],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_FAILED]: [],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.RETURN_REJECTED,
  ],
  [OrderStatus.RETURN_APPROVED]: [
    OrderStatus.RETURN_PICKED_UP,
  ],
  [OrderStatus.RETURN_REJECTED]: [],
  [OrderStatus.RETURN_PICKED_UP]: [
    OrderStatus.RETURNED,
  ],
  [OrderStatus.RETURNED]: [
    OrderStatus.REFUND_INITIATED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.REFUND_INITIATED]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.EXCHANGE_REQUESTED]: [
    OrderStatus.EXCHANGED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.EXCHANGED]: [],
};

/**
 * Terminal states that cannot transition into ongoing processing or fulfillment.
 */
export const TERMINAL_ORDER_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CANCELLED,
  OrderStatus.DELIVERED,
  OrderStatus.REFUNDED,
  OrderStatus.EXCHANGED,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.RETURN_REJECTED,
]);

/**
 * Verifies if a transition between two order statuses is permitted.
 */
export function canTransitionOrder(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  if (fromStatus === toStatus) {
    return true;
  }
  const allowed = VALID_ORDER_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

/**
 * Asserts that a state transition is legal, throwing an AppError if invalid.
 */
export function assertValidOrderTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): void {
  if (!canTransitionOrder(fromStatus, toStatus)) {
    throw new AppError(
      `Illegal order transition: cannot transition order from '${fromStatus}' to '${toStatus}'.`,
      "ILLEGAL_ORDER_STATE_TRANSITION",
      400
    );
  }
}

/**
 * Checks if a status is a terminal state.
 */
export function isTerminalOrderState(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATES.has(status);
}

/**
 * Determines whether a customer is eligible to self-cancel an order.
 * By rule, customers may only cancel orders in CONFIRMED status before processing begins.
 */
export function canCustomerCancelOrder(order: Pick<IOrder, "status">): boolean {
  return order.status === OrderStatus.CONFIRMED;
}
