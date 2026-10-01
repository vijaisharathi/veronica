import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createPayment } from "@/app/api/payments/create/route";
import { POST as verifyPayment } from "@/app/api/payments/verify/route";
import { GET as getPaymentStatus } from "@/app/api/payments/[id]/route";
import { POST as retryPayment } from "@/app/api/payments/[id]/retry/route";
import * as authModule from "@/lib/auth/session";
import { paymentService } from "@/modules/payments";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { ICustomer } from "@/types/database";
import { PaymentStatus } from "@/constants/status";

describe("Phase 18 — Payment API Integration Tests", () => {
  const customerId = "507f1f77bcf86cd799439011";
  const checkoutSessionId = "507f1f77bcf86cd799439055";
  const paymentId = "507f1f77bcf86cd799439066";

  const mockCustomer: ICustomer = {
    _id: customerId as any,
    authProviderId: "clerk_customer_aria",
    email: "aria.sharma@example.com",
    firstName: "Aria",
    lastName: "Sharma",
    displayName: "Aria Sharma",
    status: "ACTIVE" as any,
    emailVerified: true,
    phoneVerified: true,
    preferences: {} as any,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentInit = {
    paymentId,
    provider: "razorpay",
    providerOrderId: "order_rzp_123",
    amountMinor: 249900,
    currency: "INR",
    publicKeyId: "rzp_test_key_abc",
    checkoutSessionId,
    customer: {
      name: "Aria Sharma",
      email: "aria.sharma@example.com",
    },
  };

  const mockVerificationResult = {
    paymentId,
    status: PaymentStatus.CAPTURED,
    amountMinor: 249900,
    currency: "INR",
    provider: "razorpay",
    providerPaymentId: "pay_rzp_999",
    checkoutSessionId,
    verifiedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/payments/create", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      vi.spyOn(authModule, "requireCustomer").mockRejectedValueOnce(
        new AuthenticationError("Customer authentication required")
      );

      const req = new NextRequest("http://localhost:3000/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId }),
      });

      const res = await createPayment(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("returns 201 with public payment initialization parameters", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(paymentService, "initiatePayment").mockResolvedValueOnce(mockPaymentInit);

      const req = new NextRequest("http://localhost:3000/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId }),
      });

      const res = await createPayment(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.paymentId).toBe(paymentId);
      expect(body.data.amountMinor).toBe(249900);
      expect(body.data.publicKeyId).toBe("rzp_test_key_abc");
      expect(paymentService.initiatePayment).toHaveBeenCalledWith(
        customerId,
        expect.objectContaining({ checkoutSessionId })
      );
    });
  });

  describe("POST /api/payments/verify", () => {
    it("verifies payment signature and returns captured confirmation", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(paymentService, "verifyPayment").mockResolvedValueOnce(mockVerificationResult);

      const req = new NextRequest("http://localhost:3000/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          paymentId,
          razorpayOrderId: "order_rzp_123",
          razorpayPaymentId: "pay_rzp_999",
          razorpaySignature: "sig_valid_hash",
        }),
      });

      const res = await verifyPayment(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(PaymentStatus.CAPTURED);
      expect(body.data.providerPaymentId).toBe("pay_rzp_999");
    });
  });

  describe("GET /api/payments/[id]", () => {
    it("returns 404/403 when payment is not owned or not found", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(paymentService, "getPaymentStatus").mockRejectedValueOnce(
        new NotFoundError("Payment", paymentId)
      );

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ id: paymentId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it("returns 200 with payment status when owned", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(paymentService, "getPaymentStatus").mockResolvedValueOnce({
        id: paymentId,
        checkoutSessionId,
        customerId,
        provider: "razorpay",
        amountMinor: 249900,
        currency: "INR",
        status: PaymentStatus.CAPTURED,
        attempts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ id: paymentId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(PaymentStatus.CAPTURED);
    });
  });

  describe("POST /api/payments/[id]/retry", () => {
    it("re-initiates payment and returns new initialization params", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(paymentService, "retryPayment").mockResolvedValueOnce(mockPaymentInit);

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}/retry`, {
        method: "POST",
      });
      const res = await retryPayment(req, { params: Promise.resolve({ id: paymentId }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.providerOrderId).toBe("order_rzp_123");
    });
  });
});
