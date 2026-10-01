import { describe, it, expect } from "vitest";
import {
  ReturnStateMachine,
  VALID_RETURN_TRANSITIONS,
  TERMINAL_RETURN_STATES,
  CANCELLABLE_RETURN_STATES,
} from "@/modules/returns/state-machine/return-state-machine";
import { ReturnStatus } from "@/constants/status";
import { ConflictError } from "@/lib/errors";

describe("Phase 22 — Return State Machine Unit Tests", () => {
  describe("Valid Return Transitions", () => {
    it("allows REQUESTED -> UNDER_REVIEW, APPROVED, REJECTED, and CANCELLED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REQUESTED, ReturnStatus.UNDER_REVIEW)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REQUESTED, ReturnStatus.APPROVED)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REQUESTED, ReturnStatus.REJECTED)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REQUESTED, ReturnStatus.CANCELLED)).toBe(true);
      expect(() =>
        ReturnStateMachine.assertValidTransition(ReturnStatus.REQUESTED, ReturnStatus.APPROVED)
      ).not.toThrow();
    });

    it("allows UNDER_REVIEW -> APPROVED, REJECTED, and CANCELLED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.UNDER_REVIEW, ReturnStatus.APPROVED)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.UNDER_REVIEW, ReturnStatus.REJECTED)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.UNDER_REVIEW, ReturnStatus.CANCELLED)).toBe(true);
    });

    it("allows APPROVED -> PICKUP_SCHEDULED, PICKED_UP, RECEIVED, and CANCELLED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.APPROVED, ReturnStatus.PICKUP_SCHEDULED)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.APPROVED, ReturnStatus.CANCELLED)).toBe(true);
    });

    it("allows reverse logistics progression: PICKUP_SCHEDULED -> PICKED_UP -> IN_TRANSIT -> RECEIVED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.PICKUP_SCHEDULED, ReturnStatus.PICKED_UP)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.PICKUP_SCHEDULED, ReturnStatus.PICKUP_SCHEDULED)).toBe(true); // reschedule
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.PICKED_UP, ReturnStatus.IN_TRANSIT)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.IN_TRANSIT, ReturnStatus.RECEIVED)).toBe(true);
    });

    it("allows warehouse QC progression: RECEIVED -> INSPECTION -> APPROVED_FOR_SETTLEMENT -> COMPLETED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.RECEIVED, ReturnStatus.INSPECTION)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.INSPECTION, ReturnStatus.APPROVED_FOR_SETTLEMENT)).toBe(true);
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.APPROVED_FOR_SETTLEMENT, ReturnStatus.COMPLETED)).toBe(true);
    });

    it("allows INSPECTION -> REJECTED when items fail inspection", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.INSPECTION, ReturnStatus.REJECTED)).toBe(true);
    });
  });

  describe("Invalid Return Transitions & Conflict Enforcement", () => {
    it("rejects transition from terminal states: COMPLETED -> REQUESTED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.COMPLETED, ReturnStatus.REQUESTED)).toBe(false);
      expect(() =>
        ReturnStateMachine.assertValidTransition(ReturnStatus.COMPLETED, ReturnStatus.REQUESTED)
      ).toThrow(ConflictError);
    });

    it("rejects REJECTED -> PICKED_UP", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REJECTED, ReturnStatus.PICKED_UP)).toBe(false);
      expect(() =>
        ReturnStateMachine.assertValidTransition(ReturnStatus.REJECTED, ReturnStatus.PICKED_UP)
      ).toThrow(ConflictError);
    });

    it("rejects CANCELLED -> RECEIVED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.CANCELLED, ReturnStatus.RECEIVED)).toBe(false);
      expect(() =>
        ReturnStateMachine.assertValidTransition(ReturnStatus.CANCELLED, ReturnStatus.RECEIVED)
      ).toThrow(ConflictError);
    });

    it("rejects skipping QC: REQUESTED -> COMPLETED", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.REQUESTED, ReturnStatus.COMPLETED)).toBe(false);
      expect(() =>
        ReturnStateMachine.assertValidTransition(ReturnStatus.REQUESTED, ReturnStatus.COMPLETED)
      ).toThrow(ConflictError);
    });

    it("rejects customer cancellation after garments are PICKED_UP", () => {
      expect(ReturnStateMachine.isValidTransition(ReturnStatus.PICKED_UP, ReturnStatus.CANCELLED)).toBe(false);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.PICKED_UP)).toBe(false);
    });
  });

  describe("Terminal and Cancellable State Classification", () => {
    it("correctly identifies terminal states", () => {
      expect(ReturnStateMachine.isTerminal(ReturnStatus.COMPLETED)).toBe(true);
      expect(ReturnStateMachine.isTerminal(ReturnStatus.REJECTED)).toBe(true);
      expect(ReturnStateMachine.isTerminal(ReturnStatus.CANCELLED)).toBe(true);
      expect(ReturnStateMachine.isTerminal(ReturnStatus.REQUESTED)).toBe(false);
      expect(ReturnStateMachine.isTerminal(ReturnStatus.APPROVED)).toBe(false);
    });

    it("correctly identifies cancellable states", () => {
      expect(ReturnStateMachine.isCancellable(ReturnStatus.REQUESTED)).toBe(true);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.UNDER_REVIEW)).toBe(true);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.APPROVED)).toBe(true);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.PICKUP_SCHEDULED)).toBe(true);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.IN_TRANSIT)).toBe(false);
      expect(ReturnStateMachine.isCancellable(ReturnStatus.COMPLETED)).toBe(false);
    });
  });
});
