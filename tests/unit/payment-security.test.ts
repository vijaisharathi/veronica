import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "@/modules/payments/services/payment.service";
import { PaymentRepository } from "@/modules/payments/repositories/payment.repository";
import { IPaymentProvider } from "@/modules/payments/types/payment.types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";

describe("Phase 18 — Payment Security & Anti-IDOR Unit Tests", () => {
  let mockRepo: PaymentRepository;
  let mockProvider: IPaymentProvider;
  let service: PaymentService;

  const customerA = "507f1f77bcf86cd799439011";
  const customerB = "507f1f77bcf86cd799439099";
  const paymentOfCustomerAId = "507f1f77bcf86cd799439066";

  const mockPaymentA = {
    _id: paymentOfCustomerAId as any,
    customerId: customerA as any,
    checkoutSessionId: "507f1f77bcf86cd799439055" as any,
    provider: "razorpay",
    providerOrderId: "order_rzp_123",
    amount: 100000,
    amountMinor: 100000,
    currency: "INR",
    status: "PENDING" as any,
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
      findAttemptsByPaymentId: vi.fn().mockResolvedValue([]),
      recordStatusHistory: vi.fn(),
      findStatusHistory: vi.fn(),
      findWebhookEvent: vi.fn(),
      recordWebhookEvent: vi.fn(),
      updateWebhookEvent: vi.fn(),
    } as any;

    mockProvider = {
      providerName: "razorpay",
      getPublicKey: vi.fn().mockReturnValue("key"),
      createPaymentOrder: vi.fn(),
      verifyPayment: vi.fn(),
      verifyWebhook: vi.fn(),
      fetchPayment: vi.fn(),
      fetchPaymentOrder: vi.fn(),
    };

    service = new PaymentService(mockRepo, mockProvider);
  });

  describe("Anti-IDOR Protection", () => {
    it("prevents Customer B from accessing Customer A's payment status", async () => {
      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(null);

      await expect(
        service.getPaymentStatus(customerB, paymentOfCustomerAId)
      ).rejects.toThrow(NotFoundError);
    });

    it("prevents Customer B from verifying Customer A's payment", async () => {
      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(null);

      await expect(
        service.verifyPayment(customerB, {
          paymentId: paymentOfCustomerAId,
          razorpayOrderId: "order_rzp_123",
          razorpayPaymentId: "pay_123",
          razorpaySignature: "sig",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("prevents Customer B from retrying Customer A's payment", async () => {
      vi.mocked(mockRepo.findPaymentByCustomerAndId).mockResolvedValueOnce(null);

      await expect(
        service.retryPayment(customerB, paymentOfCustomerAId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
