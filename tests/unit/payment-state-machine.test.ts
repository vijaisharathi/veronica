import { describe, it, expect } from "vitest";
import {
  isValidPaymentTransition,
  assertValidPaymentTransition,
} from "@/modules/payments/validators/payment-state-machine";
import { PaymentStatus } from "@/constants/status";
import { ValidationError } from "@/lib/errors";

describe("Phase 18 — Payment State Machine Unit Tests", () => {
  describe("Valid Transitions", () => {
    it("allows CREATED -> PENDING", () => {
      expect(isValidPaymentTransition(PaymentStatus.CREATED, PaymentStatus.PENDING)).toBe(true);
      expect(() => assertValidPaymentTransition(PaymentStatus.CREATED, PaymentStatus.PENDING)).not.toThrow();
    });

    it("allows PENDING -> AUTHORIZED", () => {
      expect(isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.AUTHORIZED)).toBe(true);
    });

    it("allows PENDING -> CAPTURED", () => {
      expect(isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.CAPTURED)).toBe(true);
    });

    it("allows PENDING -> FAILED", () => {
      expect(isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.FAILED)).toBe(true);
    });

    it("allows AUTHORIZED -> CAPTURED", () => {
      expect(isValidPaymentTransition(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED)).toBe(true);
    });

    it("allows FAILED -> PENDING for payment retry", () => {
      expect(isValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.PENDING)).toBe(true);
    });

    it("allows idempotent transitions to the same state", () => {
      expect(isValidPaymentTransition(PaymentStatus.CAPTURED, PaymentStatus.CAPTURED)).toBe(true);
      expect(isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.PENDING)).toBe(true);
    });
  });

  describe("Invalid Transitions", () => {
    it("rejects CREATED -> CAPTURED (cannot skip gateway authorization/pending)", () => {
      expect(isValidPaymentTransition(PaymentStatus.CREATED, PaymentStatus.CAPTURED)).toBe(false);
      expect(() =>
        assertValidPaymentTransition(PaymentStatus.CREATED, PaymentStatus.CAPTURED)
      ).toThrow(ValidationError);
    });

    it("rejects FAILED -> CAPTURED directly without a new attempt", () => {
      expect(isValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED)).toBe(false);
      expect(() =>
        assertValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED)
      ).toThrow(ValidationError);
    });

    it("rejects CAPTURED -> PENDING", () => {
      expect(isValidPaymentTransition(PaymentStatus.CAPTURED, PaymentStatus.PENDING)).toBe(false);
    });

    it("rejects CANCELLED -> CAPTURED", () => {
      expect(isValidPaymentTransition(PaymentStatus.CANCELLED, PaymentStatus.CAPTURED)).toBe(false);
    });
  });
});
