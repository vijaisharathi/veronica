import { describe, it, expect } from "vitest";
import {
  canTransitionFulfillment,
  assertValidFulfillmentTransition,
  isTerminalFulfillmentState,
  isCancellableFulfillmentState,
} from "@/modules/fulfillment/state-machine/fulfillment-state-machine";
import { FulfillmentStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

describe("Phase 21 — Fulfillment State Machine Unit Tests", () => {
  describe("Valid Fulfillment Transitions", () => {
    it("allows PENDING -> READY_FOR_FULFILLMENT and PENDING -> CANCELLED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PENDING, FulfillmentStatus.READY_FOR_FULFILLMENT)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.PENDING, FulfillmentStatus.CANCELLED)).toBe(true);
      expect(() =>
        assertValidFulfillmentTransition(FulfillmentStatus.PENDING, FulfillmentStatus.READY_FOR_FULFILLMENT)
      ).not.toThrow();
    });

    it("allows READY_FOR_FULFILLMENT -> ALLOCATED and CANCELLED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.READY_FOR_FULFILLMENT, FulfillmentStatus.ALLOCATED)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.READY_FOR_FULFILLMENT, FulfillmentStatus.CANCELLED)).toBe(true);
    });

    it("allows ALLOCATED -> PICKING and ALLOCATED -> CANCELLED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.ALLOCATED, FulfillmentStatus.PICKING)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.ALLOCATED, FulfillmentStatus.CANCELLED)).toBe(true);
    });

    it("allows PICKING -> PICKED and PICKING -> FAILED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PICKING, FulfillmentStatus.PICKED)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.PICKING, FulfillmentStatus.FAILED)).toBe(true);
    });

    it("allows PICKED -> PACKING", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PICKED, FulfillmentStatus.PACKING)).toBe(true);
    });

    it("allows PACKING -> PACKED and PACKING -> FAILED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PACKING, FulfillmentStatus.PACKED)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.PACKING, FulfillmentStatus.FAILED)).toBe(true);
    });

    it("allows PACKED -> SHIPMENT_CREATED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PACKED, FulfillmentStatus.SHIPMENT_CREATED)).toBe(true);
    });

    it("allows SHIPMENT_CREATED -> COMPLETED and SHIPMENT_CREATED -> FAILED", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.SHIPMENT_CREATED, FulfillmentStatus.COMPLETED)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.SHIPMENT_CREATED, FulfillmentStatus.FAILED)).toBe(true);
    });

    it("allows idempotent transition to the identical status", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PICKING, FulfillmentStatus.PICKING)).toBe(true);
      expect(canTransitionFulfillment(FulfillmentStatus.COMPLETED, FulfillmentStatus.COMPLETED)).toBe(true);
    });
  });

  describe("Invalid Fulfillment Transitions & Illegal Operations", () => {
    it("rejects COMPLETED -> PICKING (terminal state)", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.COMPLETED, FulfillmentStatus.PICKING)).toBe(false);
      expect(() =>
        assertValidFulfillmentTransition(FulfillmentStatus.COMPLETED, FulfillmentStatus.PICKING)
      ).toThrow(AppError);
    });

    it("rejects CANCELLED -> ALLOCATED (terminal state)", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.CANCELLED, FulfillmentStatus.ALLOCATED)).toBe(false);
      expect(() =>
        assertValidFulfillmentTransition(FulfillmentStatus.CANCELLED, FulfillmentStatus.ALLOCATED)
      ).toThrow(AppError);
    });

    it("rejects PICKING -> COMPLETED (cannot skip pack/shipment phases)", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PICKING, FulfillmentStatus.COMPLETED)).toBe(false);
      expect(() =>
        assertValidFulfillmentTransition(FulfillmentStatus.PICKING, FulfillmentStatus.COMPLETED)
      ).toThrow(AppError);
    });

    it("rejects PACKED -> PICKING (cannot regress backwards)", () => {
      expect(canTransitionFulfillment(FulfillmentStatus.PACKED, FulfillmentStatus.PICKING)).toBe(false);
    });
  });

  describe("Cancellable States Guard", () => {
    it("permits cancellation ONLY in PENDING, READY_FOR_FULFILLMENT, ALLOCATED", () => {
      expect(isCancellableFulfillmentState(FulfillmentStatus.PENDING)).toBe(true);
      expect(isCancellableFulfillmentState(FulfillmentStatus.READY_FOR_FULFILLMENT)).toBe(true);
      expect(isCancellableFulfillmentState(FulfillmentStatus.ALLOCATED)).toBe(true);

      // In-flight or terminal states cannot be cancelled directly
      expect(isCancellableFulfillmentState(FulfillmentStatus.PICKING)).toBe(false);
      expect(isCancellableFulfillmentState(FulfillmentStatus.PICKED)).toBe(false);
      expect(isCancellableFulfillmentState(FulfillmentStatus.PACKING)).toBe(false);
      expect(isCancellableFulfillmentState(FulfillmentStatus.PACKED)).toBe(false);
      expect(isCancellableFulfillmentState(FulfillmentStatus.SHIPMENT_CREATED)).toBe(false);
      expect(isCancellableFulfillmentState(FulfillmentStatus.COMPLETED)).toBe(false);
    });
  });

  describe("Terminal States Guard", () => {
    it("correctly identifies COMPLETED, CANCELLED, and FAILED as terminal", () => {
      expect(isTerminalFulfillmentState(FulfillmentStatus.COMPLETED)).toBe(true);
      expect(isTerminalFulfillmentState(FulfillmentStatus.CANCELLED)).toBe(true);
      expect(isTerminalFulfillmentState(FulfillmentStatus.FAILED)).toBe(true);

      expect(isTerminalFulfillmentState(FulfillmentStatus.ALLOCATED)).toBe(false);
      expect(isTerminalFulfillmentState(FulfillmentStatus.PICKED)).toBe(false);
      expect(isTerminalFulfillmentState(FulfillmentStatus.PACKED)).toBe(false);
    });
  });
});
