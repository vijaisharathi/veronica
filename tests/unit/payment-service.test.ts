import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "@/modules/payments/services/payment.service";
import { PaymentRepository } from "@/modules/payments/repositories/payment.repository";
import { IPaymentProvider } from "@/modules/payments/types/payment.types";
import { checkoutService } from "@/modules/checkout";
import { PaymentStatus } from "@/constants/status";
import { CustomerModel } from "@/db/models";
import { AuthorizationError, NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/modules/checkout", () => ({
  checkoutService: {
    validateCheckout: vi.fn(),
  },
}));

vi.mock("@/db/models", () => ({
  CustomerModel: {
    findById: vi.fn(),
  },
}));

describe("Phase 18 — Payment Domain Service Unit Tests", () => {
  let mockRepo: PaymentRepository;
  let mockProvider: IPaymentProvider;
  let service: PaymentService;

  const customerId = "507f1f77bcf86cd799439011";
  const checkoutSessionId = "507f1f77bcf86cd799439055";
  const paymentId = "507f1f77bcf86cd799439066";
  const providerOrderId = "order_rzp_12345";
  const providerPaymentId = "pay_rzp_67890";

  const mockValidCheckout = {
    valid: true,
    issues: [],
    checkout: {
      id: checkoutSessionId,
      customerId,
      pricing: {
        amountDueBeforePaymentMinor: 249900,
        currency: "INR",
      },
    },
  };

  const mockCustomer = {
    _id: customerId,
    displayName: "Aria Sharma",
    email: "aria@verona.com",
    phone: "+91 98200 98200",
  };

  const mockCreatedPayment = {
    _id: paymentId as any,
    customerId: customerId as any,
    checkoutSessionId: checkoutSessionId as any,
    provider: "razorpay",
    providerOrderId,
    amount: 249900,
    amountMinor: 249900,
    currency: "INR",
    status: PaymentStatus.PENDING,
    attemptsCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockRepo = {
      findPaymentById: vi.fn(),
      findPaymentByCheckoutSession: vi.fn(),
      findPaymentByProviderOrderId: vi.fn(),
      findPaymentByCustomerAndId: vi.fn(),
      createPayment: vi.fn(),
      updatePayment: vi.fn(),
      createPaymentAttempt: vi.fn(),
      updatePaymentAttempt: vi.fn(),
      findAttemptsByPaymentId: vi.fn(),
      recordStatusHistory: vi.fn(),
      findStatusHistory: vi.fn(),
      findWebhookEvent: vi.fn(),
      recordWebhookEvent: vi.fn(),
      updateWebhookEvent: vi.fn(),
    } as any;

    mockProvider = {
      providerName: "razorpay",
      getPublicKey: vi.fn().mockReturnValue("rzp_test_key_abc"),
      createPaymentOrder: vi.fn().mockResolvedValue({
        providerOrderId,
        amountMinor: 249900,
        currency: "INR",
        status: "created",
        provider: "razorpay",
        createdAt: Math.floor(Date.now() / 1000),
      }),
      verifyPayment: vi.fn().mockResolvedValue({
        verified: true,
        providerOrderId,
        providerPaymentId,
      }),
      verifyWebhook: vi.fn().mockResolvedValue({
        verified: true,
        event: { id: "evt_1", event: "payment.captured" },
      }),
      fetchPayment: vi.fn(),
      fetchPaymentOrder: vi.fn(),
    };

    service = new PaymentService(mockRepo, mockProvider);

    vi.mocked(CustomerModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockCustomer),
    } as any);
  });

  describe("initiatePayment", () => {
    it("validates checkout and initiates payment order in minor units", async () => {
      vi.mocked(checkoutService.validateCheckout).mockResolvedValueOnce(mockValidCheckout as any);
      vi.mocked(mockRepo.findPaymentByCheckoutSession).mockResolvedValueOnce(null);
      vi.mocked(mockRepo.createPayment).mockResolvedValueOnce(mockCreatedPayment as any);

      const result = await service.initiatePayment(customerId, { checkoutSessionId });

      expect(result.paymentId).toBe(paymentId);
      expect(result.providerOrderId).toBe(providerOrderId);
      expect(result.amountMinor).toBe(249900);
      expect(result.currency).toBe("INR");
      expect(result.publicKeyId).toBe("rzp_test_key_abc");
      expect(result.customer.email).toBe("aria@verona.com");

      expect(mockProvider.createPaymentOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMinor: 249900,
          currency: "INR",
        })
      );
      expect(mockRepo.createPaymentAttempt).toHaveBeenCalled();
      expect(mockRepo.recordStatusHistory).toHaveBeenCalled();
    });

    it("rejects initiation if checkout validation has unresolved issues", async () => {
      vi.mocked(checkoutService.validateCheckout).mockResolvedValueOnce({
        valid: false,
        issues: [{ code: "DELIVERY_NOT_SERVICEABLE", message: "PIN not serviceable" }],
        checkout: mockValidCheckout.checkout,
      } as any);

      await expect(
        service.initiatePayment(customerId, { checkoutSessionId })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("verifyPayment", () => {
    it("verifies cryptographic signature and transitions status to CAPTURED", async () => {
      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(mockCreatedPayment as any);
      vi.mocked(mockRepo.updatePayment).mockResolvedValueOnce({
        ...mockCreatedPayment,
        status: PaymentStatus.CAPTURED,
        providerPaymentId,
      } as any);

      const result = await service.verifyPayment(customerId, {
        paymentId,
        razorpayOrderId: providerOrderId,
        razorpayPaymentId: providerPaymentId,
        razorpaySignature: "valid_signature_hash",
      });

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(result.providerPaymentId).toBe(providerPaymentId);
      expect(mockProvider.verifyPayment).toHaveBeenCalledWith({
        providerOrderId,
        providerPaymentId,
        signature: "valid_signature_hash",
      });
      expect(mockRepo.recordStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: PaymentStatus.PENDING,
          toStatus: PaymentStatus.CAPTURED,
          source: "CLIENT_VERIFY",
        })
      );
    });

    it("fails verification if cryptographic signature does not match", async () => {
      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(mockCreatedPayment as any);
      vi.mocked(mockProvider.verifyPayment).mockResolvedValueOnce({
        verified: false,
        providerOrderId,
        providerPaymentId,
        reason: "Cryptographic signature mismatch",
      });

      await expect(
        service.verifyPayment(customerId, {
          paymentId,
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: providerPaymentId,
          razorpaySignature: "forged_signature",
        })
      ).rejects.toThrow(ValidationError);

      expect(mockRepo.updatePayment).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({ status: PaymentStatus.FAILED })
      );
    });
  });

  describe("retryPayment", () => {
    it("creates a separate attempt and new gateway order for retry", async () => {
      const failedPayment = {
        ...mockCreatedPayment,
        status: PaymentStatus.FAILED,
      };

      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(failedPayment as any);
      vi.mocked(checkoutService.validateCheckout).mockResolvedValueOnce(mockValidCheckout as any);
      vi.mocked(mockRepo.findPaymentByCheckoutSession).mockResolvedValueOnce(failedPayment as any);
      vi.mocked(mockRepo.updatePayment).mockResolvedValueOnce({
        ...failedPayment,
        status: PaymentStatus.PENDING,
        attemptsCount: 2,
      } as any);

      const result = await service.retryPayment(customerId, paymentId);

      expect(result.providerOrderId).toBe(providerOrderId);
      expect(mockRepo.createPaymentAttempt).toHaveBeenCalled();
    });
  });
});
