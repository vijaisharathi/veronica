import { describe, it, expect } from "vitest";
import {
  canTransitionOrder,
  assertValidOrderTransition,
  canCustomerCancelOrder,
  isTerminalOrderState,
} from "@/modules/orders/state-machine/order-state-machine";
import { OrderStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

describe("Phase 19 — Order State Machine Unit Tests", () => {
  describe("Valid Order Transitions", () => {
    it("allows CONFIRMED -> PROCESSING", () => {
      expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
      expect(() =>
        assertValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)
      ).not.toThrow();
    });

    it("allows CONFIRMED -> CANCELLED", () => {
      expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
      expect(() =>
        assertValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)
      ).not.toThrow();
    });

    it("allows PROCESSING -> PACKED", () => {
      expect(canTransitionOrder(OrderStatus.PROCESSING, OrderStatus.PACKED)).toBe(true);
    });

    it("allows PROCESSING -> CANCELLED by staff", () => {
      expect(canTransitionOrder(OrderStatus.PROCESSING, OrderStatus.CANCELLED)).toBe(true);
    });

    it("allows PACKED -> SHIPPED", () => {
      expect(canTransitionOrder(OrderStatus.PACKED, OrderStatus.SHIPPED)).toBe(true);
    });

    it("allows SHIPPED -> OUT_FOR_DELIVERY and SHIPPED -> DELIVERED", () => {
      expect(canTransitionOrder(OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(canTransitionOrder(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
    });

    it("allows OUT_FOR_DELIVERY -> DELIVERED", () => {
      expect(canTransitionOrder(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
    });

    it("allows idempotent transition to the same status", () => {
      expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.CONFIRMED)).toBe(true);
      expect(canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).toBe(true);
    });
  });

  describe("Invalid Order Transitions & Terminal States", () => {
    it("rejects CANCELLED -> PROCESSING (terminal state)", () => {
      expect(canTransitionOrder(OrderStatus.CANCELLED, OrderStatus.PROCESSING)).toBe(false);
      expect(() =>
        assertValidOrderTransition(OrderStatus.CANCELLED, OrderStatus.PROCESSING)
      ).toThrow(AppError);
    });

    it("rejects DELIVERED -> PROCESSING or DELIVERED -> CANCELLED (terminal state)", () => {
      expect(canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.PROCESSING)).toBe(false);
      expect(canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    });

    it("rejects CONFIRMED -> DELIVERED skipping intermediate fulfillment", () => {
      expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.DELIVERED)).toBe(false);
      expect(() =>
        assertValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.DELIVERED)
      ).toThrow(AppError);
    });

    it("identifies terminal states correctly", () => {
      expect(isTerminalOrderState(OrderStatus.CANCELLED)).toBe(true);
      expect(isTerminalOrderState(OrderStatus.DELIVERED)).toBe(true);
      expect(isTerminalOrderState(OrderStatus.REFUNDED)).toBe(true);
      expect(isTerminalOrderState(OrderStatus.EXCHANGED)).toBe(true);

      expect(isTerminalOrderState(OrderStatus.CONFIRMED)).toBe(false);
      expect(isTerminalOrderState(OrderStatus.PROCESSING)).toBe(false);
      expect(isTerminalOrderState(OrderStatus.PACKED)).toBe(false);
      expect(isTerminalOrderState(OrderStatus.SHIPPED)).toBe(false);
    });
  });

  describe("Customer Cancellation Eligibility", () => {
    it("allows customer cancellation ONLY when order is in CONFIRMED state", () => {
      expect(canCustomerCancelOrder({ status: OrderStatus.CONFIRMED })).toBe(true);
    });

    it("disallows customer cancellation once processing has begun or in later states", () => {
      expect(canCustomerCancelOrder({ status: OrderStatus.PROCESSING })).toBe(false);
      expect(canCustomerCancelOrder({ status: OrderStatus.PACKED })).toBe(false);
      expect(canCustomerCancelOrder({ status: OrderStatus.SHIPPED })).toBe(false);
      expect(canCustomerCancelOrder({ status: OrderStatus.DELIVERED })).toBe(false);
      expect(canCustomerCancelOrder({ status: OrderStatus.CANCELLED })).toBe(false);
    });
  });
});
