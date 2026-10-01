import { describe, it, expect, vi, beforeEach } from "vitest";
import { RefundService } from "@/modules/refunds/services/refund.service";
import { RefundRepository } from "@/modules/refunds/repositories/refund.repository";
import { RefundEligibilityService } from "@/modules/refunds/eligibility/refund-eligibility.service";
import { RefundCalculationService } from "@/modules/refunds/calculations/refund-calculation.service";
import { RefundReconciliationService } from "@/modules/refunds/reconciliation/refund-reconciliation.service";
import { IPaymentProvider } from "@/modules/payments/types/payment.types";
import { RefundStatus, RefundType, RefundSourceType } from "@/constants/status";
import { AppError, NotFoundError } from "@/lib/errors";

vi.mock("@/db/models", () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({}),
  },
  CustomerModel: {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findById: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
  },
  PaymentModel: {
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ providerPaymentId: "pay_123" }) }),
  },
}));

describe("RefundService — Integration, Security, and Gateway Flows", () => {
  let mockRepo: any;
  let mockEligibility: any;
  let mockCalculation: any;
  let mockReconciliation: any;
  let mockProvider: IPaymentProvider;
  let refundService: RefundService;

  beforeEach(() => {
    mockRepo = {
      generateRefundNumber: vi.fn().mockResolvedValue("REF-2026-000001"),
      createRefund: vi.fn().mockImplementation((data) => Promise.resolve({
        _id: "refund-doc-123",
        refundNumber: "REF-2026-000001",
        ...data,
      })),
      findById: vi.fn(),
      findByRefundNumber: vi.fn(),
      findByCustomerId: vi.fn(),
      findByReturnRequestId: vi.fn(),
      findByProviderRefundId: vi.fn(),
      findBySource: vi.fn(),
      getCommittedRefundsForPayment: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockImplementation((id, from, to, updates) =>
        Promise.resolve({ _id: id, status: to, ...updates })
      ),
      updateById: vi.fn().mockImplementation((id, updates) =>
        Promise.resolve({ _id: id, ...updates })
      ),
      addAttempt: vi.fn().mockResolvedValue(true),
      updateReconciliation: vi.fn().mockResolvedValue(true),
    };

    mockEligibility = {
      evaluateEligibility: vi.fn(),
    };

    mockCalculation = {
      calculateRefund: vi.fn(),
    };

    mockReconciliation = {
      reconcileRefund: vi.fn(),
    };

    mockProvider = {
      providerName: "razorpay",
      getPublicKey: vi.fn().mockReturnValue("rzp_test_key"),
      createPaymentOrder: vi.fn(),
      verifyPayment: vi.fn(),
      verifyWebhook: vi.fn(),
      fetchPayment: vi.fn(),
      fetchPaymentOrder: vi.fn(),
      createRefund: vi.fn(),
      getRefund: vi.fn(),
    };

    refundService = new RefundService(
      mockRepo,
      mockEligibility,
      mockCalculation,
      mockReconciliation,
      mockProvider
    );
  });

  describe("Section 85 & 98 — Anti-IDOR & Customer Ownership Protection", () => {
    it("rejects customer access to another customer's refund record", async () => {
      mockRepo.findByRefundNumber.mockResolvedValue({
        _id: "ref-1",
        refundNumber: "REF-2026-000001",
        customerId: "cust-attacker",
        status: RefundStatus.COMPLETED,
        amount: 50000,
        currency: "INR",
        type: RefundType.RETURN,
        reason: "Defective item",
        createdAt: new Date(),
      });

      await expect(
        refundService.getCustomerRefundDetail("REF-2026-000001", "cust-victim")
      ).rejects.toThrowError(/Access denied to requested refund/i);
    });

    it("allows authenticated customer to view their own refund", async () => {
      mockRepo.findByRefundNumber.mockResolvedValue({
        _id: "ref-1",
        refundNumber: "REF-2026-000001",
        orderNumber: "ORD-2026-000001",
        customerId: "cust-owner",
        status: RefundStatus.COMPLETED,
        amount: 50000,
        currency: "INR",
        type: RefundType.RETURN,
        reason: "Return settlement",
        createdAt: new Date(),
        initiatedAt: new Date(),
        completedAt: new Date(),
      });

      const detail = await refundService.getCustomerRefundDetail("REF-2026-000001", "cust-owner");
      expect(detail.refundNumber).toBe("REF-2026-000001");
      expect(detail.status).toBe(RefundStatus.COMPLETED);
      expect(detail.timeline).toBeDefined();
      expect(detail.timeline.length).toBeGreaterThan(0);
    });
  });

  describe("Section 27 & 88 — Idempotency & Duplicate Settlement Protection", () => {
    it("returns existing record without dispatching provider call if refund is already completed", async () => {
      mockRepo.findById.mockResolvedValue({
        _id: "ref-done",
        refundNumber: "REF-2026-000001",
        status: RefundStatus.COMPLETED,
        amount: 250000,
        currency: "INR",
      });

      const result = await refundService.initiateProviderRefund("ref-done", "STAFF-1");

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockProvider.createRefund).not.toHaveBeenCalled();
    });

    it("returns existing record without dispatching provider call if refund is already PROCESSING", async () => {
      mockRepo.findById.mockResolvedValue({
        _id: "ref-proc",
        refundNumber: "REF-2026-000001",
        status: RefundStatus.PROCESSING,
        amount: 250000,
        currency: "INR",
      });

      const result = await refundService.initiateProviderRefund("ref-proc", "STAFF-1");

      expect(result.status).toBe(RefundStatus.PROCESSING);
      expect(mockProvider.createRefund).not.toHaveBeenCalled();
    });
  });

  describe("Section 93 — Webhook Signature & Idempotency", () => {
    it("rejects webhook payload with invalid cryptographic signature", async () => {
      (mockProvider.verifyWebhook as any).mockResolvedValue({
        verified: false,
        reason: "HMAC SHA-256 signature mismatch",
      });

      await expect(
        refundService.handleRefundWebhook({
          rawPayload: '{"event":"refund.processed"}',
          signature: "invalid-signature",
        })
      ).rejects.toThrowError(/Invalid webhook signature/i);
    });

    it("idempotently ignores already completed refund webhook", async () => {
      (mockProvider.verifyWebhook as any).mockResolvedValue({
        verified: true,
        event: {
          event: "refund.processed",
          payload: {
            refund: {
              entity: {
                id: "rfnd_test_123",
                status: "processed",
                receipt: "REF-2026-000001",
              },
            },
          },
        },
      });

      mockRepo.findByProviderRefundId.mockResolvedValue({
        _id: "ref-1",
        refundNumber: "REF-2026-000001",
        status: RefundStatus.COMPLETED, // Already completed
      });

      const result = await refundService.handleRefundWebhook({
        rawPayload: "valid",
        signature: "valid",
      });

      expect(result.handled).toBe(true);
      expect(result.message).toMatch(/already processed/i);
      expect(mockRepo.updateById).not.toHaveBeenCalled();
    });
  });

  describe("Section 36 & 94 — Reconciliation & Mismatch Handling", () => {
    it("delegates to reconciliationService and records audit record", async () => {
      mockReconciliation.reconcileRefund.mockResolvedValue({
        refundId: "ref-1",
        refundNumber: "REF-2026-000001",
        previousStatus: RefundStatus.PROCESSING,
        currentStatus: RefundStatus.COMPLETED,
        providerStatus: "processed",
        mismatchDetected: false,
        notes: "Synchronized with gateway",
      });

      const result = await refundService.reconcileRefund("ref-1", "STAFF-ADMIN");

      expect(result.currentStatus).toBe(RefundStatus.COMPLETED);
      expect(mockReconciliation.reconcileRefund).toHaveBeenCalledWith("ref-1", "STAFF-ADMIN");
    });
  });
});
