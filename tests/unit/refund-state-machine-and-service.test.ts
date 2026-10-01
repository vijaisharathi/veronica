import { describe, it, expect, vi } from "vitest";
import {
  RefundStatus,
  RefundAttemptStatus,
} from "@/constants/status";
import {
  canTransitionRefund,
  assertValidRefundTransition,
  RefundStatusMapper,
  REFUND_TRANSITIONS,
} from "@/modules/refunds/state-machine/refund-state-machine";
import { AppError } from "@/lib/errors";

describe("RefundStateMachine — Canonical Lifecycle Transitions", () => {
  describe("Permitted State Transitions", () => {
    it("allows REQUESTED -> ELIGIBLE", () => {
      expect(canTransitionRefund(RefundStatus.REQUESTED, RefundStatus.ELIGIBLE)).toBe(true);
      expect(() => assertValidRefundTransition(RefundStatus.REQUESTED, RefundStatus.ELIGIBLE)).not.toThrow();
    });

    it("allows ELIGIBLE -> INITIATED", () => {
      expect(canTransitionRefund(RefundStatus.ELIGIBLE, RefundStatus.INITIATED)).toBe(true);
    });

    it("allows INITIATED -> PROCESSING, COMPLETED, FAILED, and RECONCILIATION_REQUIRED", () => {
      expect(canTransitionRefund(RefundStatus.INITIATED, RefundStatus.PROCESSING)).toBe(true);
      expect(canTransitionRefund(RefundStatus.INITIATED, RefundStatus.COMPLETED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.INITIATED, RefundStatus.FAILED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.INITIATED, RefundStatus.RECONCILIATION_REQUIRED)).toBe(true);
    });

    it("allows PROCESSING -> COMPLETED, FAILED, and RECONCILIATION_REQUIRED", () => {
      expect(canTransitionRefund(RefundStatus.PROCESSING, RefundStatus.COMPLETED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.PROCESSING, RefundStatus.FAILED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.PROCESSING, RefundStatus.RECONCILIATION_REQUIRED)).toBe(true);
    });

    it("allows FAILED -> RETRY_PENDING and RECONCILIATION_REQUIRED", () => {
      expect(canTransitionRefund(RefundStatus.FAILED, RefundStatus.RETRY_PENDING)).toBe(true);
      expect(canTransitionRefund(RefundStatus.FAILED, RefundStatus.RECONCILIATION_REQUIRED)).toBe(true);
    });

    it("allows RETRY_PENDING -> INITIATED", () => {
      expect(canTransitionRefund(RefundStatus.RETRY_PENDING, RefundStatus.INITIATED)).toBe(true);
    });

    it("allows RECONCILIATION_REQUIRED -> COMPLETED, FAILED, and PROCESSING", () => {
      expect(canTransitionRefund(RefundStatus.RECONCILIATION_REQUIRED, RefundStatus.COMPLETED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.RECONCILIATION_REQUIRED, RefundStatus.FAILED)).toBe(true);
      expect(canTransitionRefund(RefundStatus.RECONCILIATION_REQUIRED, RefundStatus.PROCESSING)).toBe(true);
    });

    it("allows self-transitions (idempotent state confirmation)", () => {
      expect(canTransitionRefund(RefundStatus.PROCESSING, RefundStatus.PROCESSING)).toBe(true);
      expect(canTransitionRefund(RefundStatus.COMPLETED, RefundStatus.COMPLETED)).toBe(true);
    });
  });

  describe("Forbidden Transitions & Terminal State Protection", () => {
    it("strictly prevents transition out of COMPLETED terminal state", () => {
      expect(canTransitionRefund(RefundStatus.COMPLETED, RefundStatus.FAILED)).toBe(false);
      expect(canTransitionRefund(RefundStatus.COMPLETED, RefundStatus.PROCESSING)).toBe(false);
      expect(canTransitionRefund(RefundStatus.COMPLETED, RefundStatus.RETRY_PENDING)).toBe(false);
      expect(() => assertValidRefundTransition(RefundStatus.COMPLETED, RefundStatus.FAILED)).toThrow(AppError);
    });

    it("strictly prevents invalid state jump: REQUESTED -> COMPLETED without provider dispatch", () => {
      expect(canTransitionRefund(RefundStatus.REQUESTED, RefundStatus.COMPLETED)).toBe(false);
      expect(() => assertValidRefundTransition(RefundStatus.REQUESTED, RefundStatus.COMPLETED)).toThrowError(
        /Illegal refund transition from REQUESTED to COMPLETED/i
      );
    });

    it("strictly prevents invalid state jump: ELIGIBLE -> COMPLETED", () => {
      expect(canTransitionRefund(RefundStatus.ELIGIBLE, RefundStatus.COMPLETED)).toBe(false);
    });

    it("strictly prevents RETRY_PENDING directly to COMPLETED without INITIATED", () => {
      expect(canTransitionRefund(RefundStatus.RETRY_PENDING, RefundStatus.COMPLETED)).toBe(false);
    });
  });

  describe("RefundStatusMapper — Payment Provider Status Normalization", () => {
    it("maps provider 'processed' and 'completed' to COMPLETED", () => {
      expect(RefundStatusMapper.fromProviderStatus("processed")).toBe(RefundStatus.COMPLETED);
      expect(RefundStatusMapper.fromProviderStatus("PROCESSED")).toBe(RefundStatus.COMPLETED);
      expect(RefundStatusMapper.fromProviderStatus("completed")).toBe(RefundStatus.COMPLETED);
      expect(RefundStatusMapper.fromProviderStatus("succeeded")).toBe(RefundStatus.COMPLETED);
    });

    it("maps provider 'failed' and 'rejected' to FAILED", () => {
      expect(RefundStatusMapper.fromProviderStatus("failed")).toBe(RefundStatus.FAILED);
      expect(RefundStatusMapper.fromProviderStatus("rejected")).toBe(RefundStatus.FAILED);
      expect(RefundStatusMapper.fromProviderStatus("cancelled")).toBe(RefundStatus.FAILED);
    });

    it("maps provider 'pending' and ambiguous statuses to PROCESSING", () => {
      expect(RefundStatusMapper.fromProviderStatus("pending")).toBe(RefundStatus.PROCESSING);
      expect(RefundStatusMapper.fromProviderStatus("submitted")).toBe(RefundStatus.PROCESSING);
      expect(RefundStatusMapper.fromProviderStatus(undefined)).toBe(RefundStatus.PROCESSING);
      expect(RefundStatusMapper.fromProviderStatus("unknown_status")).toBe(RefundStatus.PROCESSING);
    });
  });
});
